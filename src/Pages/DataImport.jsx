import React, { useState } from "react";
import { Customer, Product, Transaction } from "@/Entities/all";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, AlertCircle, Download, Database, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExtractDataFromUploadedFile, UploadFile } from "@/integrations/Core";
import { Progress } from "@/components/ui/progress";

export default function DataImport() {
  const [uploadState, setUploadState] = useState({
    customers: { file: null, status: 'idle', progress: 0, count: 0 },
    products: { file: null, status: 'idle', progress: 0, count: 0 },
    transactions: { file: null, status: 'idle', progress: 0, count: 0 }
  });
  const [error, setError] = useState(null);

  const handleFileSelect = (type, file) => {
    setUploadState(prev => ({
      ...prev,
      [type]: { ...prev[type], file, status: 'ready' }
    }));
    setError(null);
  };

  // ✅ NEW: Aggregate customer data from transactions
  const aggregateCustomersFromTransactions = (transactions) => {
    const customerMap = new Map();

    transactions.forEach(txn => {
      const customerKey = txn.customer_name || txn.email;
      if (!customerKey) return;

      if (!customerMap.has(customerKey)) {
        customerMap.set(customerKey, {
          customer_name: txn.customer_name,
          email: txn.email || `${customerKey}@example.com`,
          total_spent: 0,
          total_purchases: 0,
          last_purchase_date: txn.transaction_date,
          segment: 'regular',
          churn_risk_score: 20
        });
      }

      const customer = customerMap.get(customerKey);
      customer.total_spent += parseFloat(txn.total_amount) || 0;
      customer.total_purchases += 1;
      
      // Keep most recent purchase date
      if (new Date(txn.transaction_date) > new Date(customer.last_purchase_date)) {
        customer.last_purchase_date = txn.transaction_date;
      }
    });

    // Calculate segments based on total_spent
    const customers = Array.from(customerMap.values()).map(customer => {
      const spent = customer.total_spent;
      if (spent >= 5000) {
        customer.segment = 'premium';
      } else if (spent >= 2000) {
        customer.segment = 'regular';
      } else if (spent >= 500) {
        customer.segment = 'budget';
      } else {
        customer.segment = 'at_risk';
      }
      return customer;
    });

    return customers;
  };

  const processCSV = async (type) => {
    const state = uploadState[type];
    if (!state.file) return;

    setUploadState(prev => ({
      ...prev,
      [type]: { ...prev[type], status: 'uploading', progress: 20 }
    }));

    try {
      const fileContent = await state.file.text();
      window._uploaded_file_content = fileContent;
      
      const { file_url } = await UploadFile({ file: state.file });
      
      setUploadState(prev => ({
        ...prev,
        [type]: { ...prev[type], progress: 40 }
      }));

      const schemas = {
        customers: Customer.schema(),
        products: Product.schema(),
        transactions: Transaction.schema()
      };

      const result = await ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "array",
          items: schemas[type]
        }
      });

      setUploadState(prev => ({
        ...prev,
        [type]: { ...prev[type], progress: 70 }
      }));

      if (result.status === "success" && result.output) {
        const records = Array.isArray(result.output) ? result.output : [result.output];
        
        console.log(`✅ Processing ${records.length} ${type} records...`);

        // ✅ CRITICAL: Special handling for transactions to create aggregated customers
        if (type === 'transactions') {
          // Import transactions first
          for (const record of records) {
            const cleanRecord = { ...record };
            Object.keys(cleanRecord).forEach(key => {
              if (cleanRecord[key] === '' || cleanRecord[key] === null || cleanRecord[key] === undefined) {
                delete cleanRecord[key];
              }
            });
            await Transaction.create(cleanRecord);
          }

          // Now create aggregated customers
          const aggregatedCustomers = aggregateCustomersFromTransactions(records);
          console.log(`✅ Created ${aggregatedCustomers.length} unique customers from transactions`);
          
          for (const customer of aggregatedCustomers) {
            await Customer.create(customer);
          }
        } else {
          // Normal import for products and customers
          const entities = {
            customers: Customer,
            products: Product
          };

          for (const record of records) {
            const cleanRecord = { ...record };
            Object.keys(cleanRecord).forEach(key => {
              if (cleanRecord[key] === '' || cleanRecord[key] === null || cleanRecord[key] === undefined) {
                delete cleanRecord[key];
              }
            });
            await entities[type].create(cleanRecord);
          }
        }

        setUploadState(prev => ({
          ...prev,
          [type]: { 
            ...prev[type], 
            status: 'success', 
            progress: 100,
            count: records.length 
          }
        }));
        
        console.log(`✅ Successfully imported ${records.length} ${type}`);
      } else {
        throw new Error(result.details || "Failed to extract data");
      }
    } catch (err) {
      console.error(`❌ Error processing ${type}:`, err);
      setError(`Error processing ${type}: ${err.message}`);
      setUploadState(prev => ({
        ...prev,
        [type]: { ...prev[type], status: 'error', progress: 0 }
      }));
    }
  };

  const downloadTemplate = (type) => {
    const templates = {
      customers: `customer_name,email,phone,country,city,age,gender,segment,total_purchases,total_spent,last_purchase_date,churn_risk_score
James Martinez,james.m@email.com,+1-555-0100,USA,New York,35,male,premium,42,15200,2024-12-20,15
Emma Williams,emma.w@email.com,+1-555-0101,USA,Los Angeles,28,female,premium,35,12800,2024-12-18,18`,
      products: `product_name,category,subcategory,price,cost,stock_quantity,reorder_level,total_sold,revenue_generated,average_rating
Yoga Mat Premium,sports,fitness,49,25,180,50,678,33222,4.8
Designer Jeans,clothing,apparel,89,45,200,60,567,50463,4.7`,
      transactions: `transaction_id,customer_name,email,transaction_date,total_amount,payment_method,status,items
TXN-001,James Martinez,james.m@email.com,2024-12-01T10:00:00Z,1567,"[{""product_name"":""Premium Laptop"",""quantity"":1,""unit_price"":1299},{""product_name"":""Wireless Mouse"",""quantity"":2,""unit_price"":49.99}]"
TXN-002,Emma Williams,emma.w@email.com,2024-12-02T11:30:00Z,1498,"[{""product_name"":""Smart Watch Pro"",""quantity"":1,""unit_price"":399},{""product_name"":""Wireless Headphones"",""quantity"":1,""unit_price"":199}]"`
    };

    const blob = new Blob([templates[type]], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const UploadCard = ({ type, title, icon: Icon, description }) => {
    const state = uploadState[type];
    
    return (
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-indigo-600" />
            {title}
          </CardTitle>
          <p className="text-sm text-slate-500">{description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            onClick={() => downloadTemplate(type)}
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Download CSV Template
          </Button>

          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-300 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => handleFileSelect(type, e.target.files[0])}
              className="hidden"
              id={`${type}-upload`}
            />
            <label htmlFor={`${type}-upload`} className="cursor-pointer">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-600 mb-1">
                {state.file ? state.file.name : 'Click to upload CSV file'}
              </p>
              <p className="text-xs text-slate-400">CSV format only</p>
            </label>
          </div>

          {state.status === 'uploading' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Processing...</span>
                <span className="font-semibold text-indigo-600">{state.progress}%</span>
              </div>
              <Progress value={state.progress} className="h-2" />
            </div>
          )}

          {state.status === 'success' && (
            <Alert className="bg-emerald-50 border-emerald-200">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800">
                Successfully imported {state.count} records!
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={() => processCSV(type)}
            disabled={!state.file || state.status === 'uploading' || state.status === 'success'}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {state.status === 'uploading' ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : state.status === 'success' ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Imported
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          Data Import Center
        </h1>
        <p className="text-slate-600">Upload your retail datasets to start analytics</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="border-0 shadow-lg shadow-indigo-200/50 bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardContent className="p-6">
          <h3 className="font-bold text-lg text-slate-900 mb-3 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            How to Import Your Data
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-white rounded-lg">
              <Badge className="bg-indigo-600 text-white mb-2">Step 1</Badge>
              <p className="text-slate-700">Upload transactions CSV - customers will be auto-created</p>
            </div>
            <div className="p-4 bg-white rounded-lg">
              <Badge className="bg-purple-600 text-white mb-2">Step 2</Badge>
              <p className="text-slate-700">Upload products CSV with pricing and inventory data</p>
            </div>
            <div className="p-4 bg-white rounded-lg">
              <Badge className="bg-pink-600 text-white mb-2">Step 3</Badge>
              <p className="text-slate-700">System will aggregate and segment customers automatically</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="transactions" className="space-y-6">
        <TabsList className="bg-white border border-slate-200 p-1">
          <TabsTrigger value="transactions" className="data-[state=active]:bg-indigo-100">
            Transactions
            {uploadState.transactions.status === 'success' && (
              <CheckCircle className="w-4 h-4 ml-2 text-emerald-600" />
            )}
          </TabsTrigger>
          <TabsTrigger value="products" className="data-[state=active]:bg-indigo-100">
            Products
            {uploadState.products.status === 'success' && (
              <CheckCircle className="w-4 h-4 ml-2 text-emerald-600" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <div className="grid lg:grid-cols-2 gap-6">
            <UploadCard
              type="transactions"
              title="Transaction History"
              icon={Database}
              description="Upload transactions - customers will be auto-generated and aggregated"
            />
            
            <Card className="border-0 shadow-lg shadow-slate-200/50">
              <CardHeader>
                <CardTitle className="text-lg">Required Fields</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">transaction_id</Badge>
                    <span className="text-slate-600">Unique transaction ID</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">customer_name</Badge>
                    <span className="text-slate-600">Customer full name</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">email</Badge>
                    <span className="text-slate-600">Customer email</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">total_amount</Badge>
                    <span className="text-slate-600">Transaction total</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">items</Badge>
                    <span className="text-slate-600">JSON array of products</span>
                  </div>
                  <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-xs font-semibold text-emerald-900 mb-1">✨ Auto-Processing</p>
                    <p className="text-xs text-emerald-800">
                      Customers will be automatically created and aggregated by email with proper segments
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products">
          <div className="grid lg:grid-cols-2 gap-6">
            <UploadCard
              type="products"
              title="Product Catalog"
              icon={Database}
              description="Upload product information including pricing and inventory"
            />
            
            <Card className="border-0 shadow-lg shadow-slate-200/50">
              <CardHeader>
                <CardTitle className="text-lg">Required Fields</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">product_name</Badge>
                    <span className="text-slate-600">Product name</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">category</Badge>
                    <span className="text-slate-600">Product category</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">price</Badge>
                    <span className="text-slate-600">Selling price</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">stock_quantity</Badge>
                    <span className="text-slate-600">Available stock</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {(uploadState.transactions.status === 'success' || uploadState.products.status === 'success') && (
        <Card className="border-0 shadow-lg shadow-emerald-200/50 bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-6">
            <h3 className="font-bold text-lg text-emerald-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Import Summary
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {uploadState.transactions.status === 'success' && (
                <div className="p-4 bg-white rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">Transactions</p>
                  <p className="text-2xl font-bold text-emerald-600">{uploadState.transactions.count}</p>
                </div>
              )}
              {uploadState.products.status === 'success' && (
                <div className="p-4 bg-white rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">Products</p>
                  <p className="text-2xl font-bold text-emerald-600">{uploadState.products.count}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}