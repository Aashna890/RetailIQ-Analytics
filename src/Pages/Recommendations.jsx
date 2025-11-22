import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Sparkles, RefreshCw, ShoppingBag, AlertCircle, TrendingUp, Users, Upload } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Papa from 'papaparse';

export default function Recommendations() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [allRecommendations, setAllRecommendations] = useState({});
  const [error, setError] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setError(null);
      setProcessingStatus("Parsing CSV...");

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        transformHeader: (h) => h.trim(),
        complete: (results) => {
          processUploadedData(results.data);
        },
        error: (err) => {
          setError(`CSV parsing error: ${err.message}`);
          setIsLoading(false);
        }
      });
    } catch (err) {
      setError(`File upload error: ${err.message}`);
      setIsLoading(false);
    }
  };

  const processUploadedData = (data) => {
    try {
      setProcessingStatus("Processing transactions...");

      // Extract unique customers
      const customersMap = new Map();
      const productsSet = new Set();
      const transactionsArray = [];

      data.forEach((row) => {
        if (!row.customer_name || !row.email) return;

        const customerKey = row.email.toLowerCase().trim();
        
        if (!customersMap.has(customerKey)) {
          customersMap.set(customerKey, {
            id: customerKey,
            customer_name: row.customer_name.trim(),
            email: row.email.toLowerCase().trim(),
            total_spent: 0,
            total_purchases: 0,
            segment: determinSegment(parseFloat(row.total_amount || 0)),
            churn_risk_score: Math.random() * 30
          });
        }

        // Add transaction
        const txn = {
          id: row.transaction_id || `TXN-${Math.random()}`,
          customer_name: row.customer_name.trim(),
          email: row.email.toLowerCase().trim(),
          customer_id: customerKey,
          items: [{
            product_name: row.product_name?.trim() || "Unknown",
            price: parseFloat(row.price) || 0,
            quantity: parseInt(row.total_sold) || 1,
            revenue_generated: parseFloat(row.revenue_generated) || 0
          }]
        };
        transactionsArray.push(txn);

        // Update customer totals
        const customer = customersMap.get(customerKey);
        customer.total_spent += parseFloat(row.revenue_generated) || 0;
        customer.total_purchases += parseInt(row.total_sold) || 1;

        // Add product
        const productName = row.product_name?.trim() || "Unknown";
        if (!productsSet.has(productName)) {
          productsSet.add(productName);
        }
      });

      const customersArray = Array.from(customersMap.values());
      const productsArray = Array.from(productsSet).map(name => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        product_name: name,
        price: 0, // Will be inferred from transactions
        category: categorizeProduct(name),
        total_sold: 0
      }));

      setCustomers(customersArray);
      setProducts(productsArray);
      setTransactions(transactionsArray);
      setDataLoaded(true);
      setAllRecommendations({});
      setProcessingStatus(`Loaded ${customersArray.length} customers, ${transactionsArray.length} transactions`);
      setIsLoading(false);

      console.log("Data processed:", {
        customers: customersArray.length,
        products: productsArray.length,
        transactions: transactionsArray.length
      });
    } catch (err) {
      setError(`Data processing error: ${err.message}`);
      setIsLoading(false);
    }
  };

  const determinSegment = (totalSpent) => {
    if (totalSpent > 1500) return "premium";
    if (totalSpent < 500) return "budget";
    return "standard";
  };

  const categorizeProduct = (productName) => {
    const name = productName?.toLowerCase() || '';
    if (name.includes('laptop')) return 'Computing';
    if (name.includes('monitor') || name.includes('keyboard') || name.includes('mouse')) return 'Peripherals';
    if (name.includes('gaming') || name.includes('chair')) return 'Gaming';
    if (name.includes('headphone') || name.includes('speaker') || name.includes('earbuds')) return 'Audio';
    if (name.includes('webcam') || name.includes('camera')) return 'Video';
    if (name.includes('tablet')) return 'Computing';
    if (name.includes('smartwatch')) return 'Wearables';
    if (name.includes('hard drive') || name.includes('storage')) return 'Storage';
    return 'Accessories';
  };

  const parseItems = (items) => {
    if (!items) return [];
    if (Array.isArray(items)) return items;
    if (typeof items === 'string') {
      try {
        const parsed = JSON.parse(items);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  const calculateMedian = (arr) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const extractCustomerPatterns = (customer) => {
    const patterns = {
      categoryPreferences: new Map(),
      productPurchases: new Map(),
      priceDistribution: [],
      purchasedProductNames: new Set()
    };

    transactions.forEach(t => {
      const isMatch = 
        t.email?.toLowerCase().trim() === customer.email?.toLowerCase().trim() ||
        t.customer_id === customer.id;

      if (!isMatch) return;

      const items = parseItems(t.items);
      items.forEach(item => {
        const productName = item.product_name || item;
        if (!productName) return;

        const key = String(productName).toLowerCase().trim();
        patterns.purchasedProductNames.add(key);
        
        const category = categorizeProduct(String(productName));
        patterns.categoryPreferences.set(
          category,
          (patterns.categoryPreferences.get(category) || 0) + 1
        );

        patterns.productPurchases.set(key, (patterns.productPurchases.get(key) || 0) + 1);
        
        const price = parseFloat(item.price || 0);
        if (price > 0) {
          patterns.priceDistribution.push(price);
        }
      });
    });

    const avgSpend = customer.total_spent / Math.max(customer.total_purchases, 1);
    
    patterns.priceStats = {
      min: patterns.priceDistribution.length > 0 ? Math.min(...patterns.priceDistribution) : avgSpend * 0.5,
      max: patterns.priceDistribution.length > 0 ? Math.max(...patterns.priceDistribution) : avgSpend * 2,
      avg: patterns.priceDistribution.length > 0
        ? patterns.priceDistribution.reduce((a, b) => a + b, 0) / patterns.priceDistribution.length
        : avgSpend,
      median: calculateMedian(patterns.priceDistribution)
    };

    return patterns;
  };

  const calculateItemSimilarity = (product1Name, product1Price, product2Name, product2Price) => {
    let similarity = 0;
    
    const cat1 = categorizeProduct(product1Name);
    const cat2 = categorizeProduct(product2Name);
    
    if (cat1 === cat2) similarity += 40;
    
    const p1 = parseFloat(product1Price) || 0;
    const p2 = parseFloat(product2Price) || 0;
    if (p1 > 0 && p2 > 0) {
      const priceDiff = Math.abs(p1 - p2);
      const avgPrice = (p1 + p2) / 2;
      const priceSimScore = Math.max(0, 30 * (1 - priceDiff / avgPrice));
      similarity += priceSimScore;
    }
    
    const name1 = product1Name.toLowerCase();
    const name2 = product2Name.toLowerCase();
    const words1 = name1.split(' ');
    const words2 = name2.split(' ');
    const commonWords = words1.filter(w => words2.includes(w)).length;
    similarity += commonWords * 10;
    
    return similarity / 100;
  };

  const calculateCollaborativeScore = (productName, productPrice, customerPatterns) => {
    let cfScore = 0;
    let count = 0;
    
    customerPatterns.purchasedProductNames.forEach(purchasedName => {
      const purchasedItem = transactions.find(t => {
        const items = parseItems(t.items);
        return items.some(item => item.product_name?.toLowerCase().trim() === purchasedName);
      });
      
      if (purchasedItem) {
        const items = parseItems(purchasedItem.items);
        const item = items.find(i => i.product_name?.toLowerCase().trim() === purchasedName);
        if (item) {
          const sim = calculateItemSimilarity(productName, productPrice, item.product_name, item.price);
          cfScore += sim;
          count++;
        }
      }
    });
    
    return count > 0 ? (cfScore / count) * 100 : 0;
  };

  const analyzeSegmentBehavior = (segment, priceStats) => {
    const analysis = {
      priceRange: { min: 0, max: Infinity },
      preferredPricePoint: priceStats.avg,
      discountSensitivity: 'medium'
    };

    switch(segment?.toLowerCase()) {
      case 'premium':
        analysis.priceRange = { min: priceStats.avg * 0.7, max: Infinity };
        analysis.preferredPricePoint = priceStats.avg * 1.2;
        analysis.discountSensitivity = 'low';
        break;
      case 'budget':
        analysis.priceRange = { min: 0, max: priceStats.avg * 1.3 };
        analysis.preferredPricePoint = priceStats.avg * 0.8;
        analysis.discountSensitivity = 'high';
        break;
      default:
        analysis.priceRange = { min: priceStats.avg * 0.6, max: priceStats.avg * 1.5 };
        analysis.preferredPricePoint = priceStats.avg;
        analysis.discountSensitivity = 'medium';
    }

    return analysis;
  };

  const calculateSegmentScore = (price, segmentAnalysis, segment) => {
    let score = 0;
    const reasons = [];
    
    const productPrice = parseFloat(price) || 0;
    
    if (productPrice >= segmentAnalysis.priceRange.min && 
        productPrice <= segmentAnalysis.priceRange.max) {
      score += 35;
      reasons.push(`Perfect for ${segment} segment`);
    }
    
    const priceDiff = Math.abs(productPrice - segmentAnalysis.preferredPricePoint);
    const priceProximityScore = Math.max(0, 15 * (1 - priceDiff / segmentAnalysis.preferredPricePoint));
    score += priceProximityScore;
    
    if (segment?.toLowerCase() === 'premium' && productPrice > segmentAnalysis.preferredPricePoint) {
      score += 10;
      reasons.push("Premium quality");
    }
    
    if (segment?.toLowerCase() === 'budget' && productPrice < segmentAnalysis.preferredPricePoint) {
      score += 10;
      reasons.push("Great value");
    }
    
    return { score, reasons };
  };

  const buildProductCatalog = () => {
    const catalog = new Map();
    
    transactions.forEach(t => {
      const items = parseItems(t.items);
      items.forEach(item => {
        const productName = item.product_name || item;
        if (!productName) return;
        
        const key = String(productName).toLowerCase().trim();
        
        if (!catalog.has(key)) {
          catalog.set(key, {
            product_name: String(productName),
            price: parseFloat(item.price) || 0,
            category: categorizeProduct(String(productName)),
            total_sold: 0,
            revenue_generated: 0
          });
        }
        
        const product = catalog.get(key);
        const quantity = parseInt(item.quantity || 1);
        const revenue = parseFloat(item.revenue_generated) || (parseFloat(item.price) * quantity);
        
        product.total_sold += quantity;
        product.revenue_generated += revenue;
      });
    });
    
    return Array.from(catalog.values());
  };

  const calculateRecommendationConfidence = (customer) => {
    let productCatalog = buildProductCatalog();

    const patterns = extractCustomerPatterns(customer);
    const avgPrice = patterns.priceStats.avg || 100;
    
    productCatalog = productCatalog.map(product => {
      if (product.price === 0 || !product.price) {
        const categoryMultiplier = {
          'Computing': 1.8,
          'Peripherals': 0.6,
          'Gaming': 1.5,
          'Audio': 0.8,
          'Video': 1.2,
          'Wearables': 0.9,
          'Storage': 1.0,
          'Accessories': 0.4
        }[product.category] || 1.0;
        
        product.price = Math.round(avgPrice * categoryMultiplier);
      }
      return product;
    });

    const segmentAnalysis = analyzeSegmentBehavior(customer.segment, patterns.priceStats);
    
    const scoredProducts = productCatalog
      .filter(product => product.price > 0)
      .map(product => {
        const productKey = product.product_name.toLowerCase().trim();
        
        const alreadyPurchased = Array.from(patterns.purchasedProductNames).some(purchased => 
          productKey === purchased || productKey.includes(purchased) || purchased.includes(productKey)
        );
        
        if (alreadyPurchased) return null;

        let confidence = 0;
        const reasoning = [];

        const productCategory = categorizeProduct(product.product_name);
        const categoryFreq = patterns.categoryPreferences.get(productCategory) || 0;
        
        if (categoryFreq > 0) {
          const categoryScore = Math.min(35, categoryFreq * 10);
          confidence += categoryScore;
          reasoning.push(`You purchased ${productCategory} ${categoryFreq}x`);
        } else if (patterns.categoryPreferences.size === 0) {
          confidence += 25;
          reasoning.push("Recommended for you");
        } else {
          confidence += 15;
          reasoning.push("Complementary product");
        }

        const cfScore = calculateCollaborativeScore(product.product_name, product.price, patterns);
        confidence += cfScore * 0.30;
        if (cfScore > 50) reasoning.push("Similar to past purchases");

        const segmentResult = calculateSegmentScore(product.price, segmentAnalysis, customer.segment);
        confidence += segmentResult.score * 0.25;
        reasoning.push(...segmentResult.reasons);

        if (product.total_sold > 10) {
          confidence += 5;
          reasoning.push("Popular item");
        }

        const normalizedConfidence = Math.min(100, Math.round(confidence));

        return {
          product_name: product.product_name,
          category: productCategory,
          price: product.price,
          confidence: normalizedConfidence,
          reasoning: reasoning.join(" • ") || "Recommended for you",
          total_sold: product.total_sold
        };
      })
      .filter(p => p !== null && p.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 20);

    if (scoredProducts.length === 0) {
      const fallbackProducts = productCatalog
        .filter(p => p.price > 0)
        .slice(0, 10)
        .map((p, i) => ({
          product_name: p.product_name,
          category: p.category,
          price: p.price,
          confidence: 50 - (i * 5),
          reasoning: "Recommended based on inventory",
          total_sold: p.total_sold
        }));
      
      return { 
        scoredProducts: fallbackProducts.slice(0, 8), 
        patterns, 
        segmentAnalysis,
        isFallback: true
      };
    }

    return { scoredProducts, patterns, segmentAnalysis };
  };

  const generateRecommendations = async (customer) => {
    try {
      const { scoredProducts, patterns, isFallback } = calculateRecommendationConfidence(customer);

      if (scoredProducts.length === 0) {
        throw new Error("No products to recommend");
      }

      await new Promise(resolve => setTimeout(resolve, 300));

      const topProducts = scoredProducts.slice(0, 5);
      const topCategories = Array.from(patterns.categoryPreferences.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat)
        .join(", ") || "Electronics";

      const result = {
        recommendations: topProducts.map(p => ({
          product_name: p.product_name,
          category: p.category,
          price: p.price,
          reason: p.reasoning,
          confidence: p.confidence
        })),
        discount_suggestion: {
          percentage: customer.segment === 'premium' ? 5 : customer.segment === 'budget' ? 15 : 10,
          reasoning: `Optimized for ${customer.segment} segment`
        },
        engagement_strategy: `Recommend ${topCategories} products. Offer ${customer.segment === 'budget' ? '15-20% discount' : customer.segment === 'premium' ? 'exclusive access' : 'personalized deals'}.`
      };

      const analysisData = {
        totalScored: scoredProducts.length,
        topCategories: Array.from(patterns.categoryPreferences.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([cat]) => cat),
        avgConfidence: Math.round(
          topProducts.reduce((sum, p) => sum + p.confidence, 0) / Math.min(5, topProducts.length)
        ),
        priceRange: `$${Math.round(patterns.priceStats.min)}-$${Math.round(patterns.priceStats.max)}`,
        segment: customer.segment,
        purchaseCount: patterns.purchasedProductNames.size
      };

      setAllRecommendations(prev => ({
        ...prev,
        [customer.id]: { recommendations: result, analysisData }
      }));

    } catch (err) {
      console.error("Generation error:", err);
    }
  };

  const generateAllRecommendations = async () => {
    setIsGeneratingAll(true);
    setProcessingStatus(`Starting to process ${customers.length} customers...`);
    
    for (let i = 0; i < customers.length; i++) {
      setProcessingStatus(`Processing ${i + 1} of ${customers.length}: ${customers[i].customer_name}`);
      await generateRecommendations(customers[i]);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setIsGeneratingAll(false);
    setProcessingStatus(`Completed! Generated recommendations for ${customers.length} customers`);
  };

  if (!dataLoaded) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
            Product Recommendations
          </h1>
          <p className="text-slate-600 text-lg">
            AI-powered personalized suggestions with collaborative filtering
          </p>
        </div>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="w-5 h-5 text-blue-600" />
              Upload Transaction Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="w-12 h-12 text-blue-400" />
                    <div>
                      <p className="font-semibold text-slate-900">Click to upload CSV</p>
                      <p className="text-sm text-slate-600">Required columns: transaction_id, customer_name, email, product_name, price, total_sold, revenue_generated</p>
                    </div>
                  </div>
                </label>
              </div>
              {isLoading && (
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 text-blue-600 animate-spin" />
                  <p className="text-slate-600">{processingStatus}</p>
                </div>
              )}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
          Product Recommendations
        </h1>
        <p className="text-slate-600 text-lg">
          {customers.length} customers • {transactions.length} transactions
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-blue-600" />
            Customer Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Select onValueChange={(customerId) => {
              const customer = customers.find(c => c.id === customerId);
              if (customer && allRecommendations[customerId]) {
                const rec = allRecommendations[customerId];
                setSelectedCustomer(customer);
                setRecommendations(rec.recommendations);
                setAnalysisData(rec.analysisData);
              }
            }}>
              <SelectTrigger className="flex-1 min-w-64 h-12 text-base">
                <SelectValue placeholder="Select customer to view recommendations" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.customer_name} - ${Math.round(customer.total_spent)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={generateAllRecommendations}
              disabled={isGeneratingAll || customers.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {isGeneratingAll ? "Generating..." : "Generate All"}
            </button>
          </div>
          <div className="text-sm text-slate-600">
            <p className="font-semibold">{Object.keys(allRecommendations).length} of {customers.length} customers processed</p>
            {processingStatus && <p className="text-xs mt-1">{processingStatus}</p>}
          </div>
        </CardContent>
      </Card>

      {isGeneratingAll && (
        <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50">
          <CardContent className="p-16 text-center">
            <RefreshCw className="w-16 h-16 mx-auto mb-6 text-blue-600 animate-spin" />
            <h3 className="text-2xl font-bold text-slate-900 mb-3">Processing Customers</h3>
            <p className="text-slate-600">{processingStatus}</p>
          </CardContent>
        </Card>
      )}

      {recommendations && selectedCustomer && (
        <div className="space-y-6">
          <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-50 via-blue-50 to-purple-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{selectedCustomer.customer_name}</h3>
                  <p className="text-slate-600">{selectedCustomer.email}</p>
                </div>
                <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-base px-4 py-2">
                  {selectedCustomer.segment?.toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {analysisData && (
            <div className="grid grid-cols-4 gap-4">
              <Card className="border-0 shadow-md">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{analysisData.totalScored}</p>
                  <p className="text-xs text-slate-600 mt-1">Products Analyzed</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-purple-600">{analysisData.avgConfidence}%</p>
                  <p className="text-xs text-slate-600 mt-1">Avg Confidence</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-cyan-600">{analysisData.purchaseCount}</p>
                  <p className="text-xs text-slate-600 mt-1">Past Purchases</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-600">{recommendations.recommendations?.length || 0}</p>
                  <p className="text-xs text-slate-600 mt-1">Recommendations</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card className="border-0 shadow-xl">
            <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
              <CardTitle className="flex items-center gap-2 text-xl">
                <ShoppingBag className="w-6 h-6 text-blue-600" />
                Top Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-5">
                {recommendations.recommendations?.map((rec, index) => (
                  <div key={index} className="group p-6 rounded-2xl border-2 border-slate-200 hover:border-blue-400 hover:shadow-xl transition-all bg-white">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </span>
                          <h4 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">
                            {rec.product_name}
                          </h4>
                        </div>
                        <Badge className="bg-slate-100 text-slate-700 text-xs">
                          {rec.category}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          ${typeof rec.price === 'number' ? rec.price.toFixed(2) : rec.price}
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                      {rec.reason}
                    </p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-semibold">Confidence Score</span>
                        <span className="text-base font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          {Math.round(rec.confidence)}%
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 transition-all duration-500 rounded-full"
                          style={{ width: `${Math.min(rec.confidence, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50">
              <CardHeader className="border-b border-emerald-100">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  Discount Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="inline-block p-6 bg-white rounded-2xl shadow-lg">
                    <p className="text-6xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
                      {recommendations.discount_suggestion?.percentage}%
                    </p>
                    <p className="text-sm text-slate-600 font-medium">Recommended Discount</p>
                  </div>
                </div>
                <div className="p-5 bg-white rounded-xl border border-emerald-100">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {recommendations.discount_suggestion?.reasoning}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50">
              <CardHeader className="border-b border-blue-100">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="w-5 h-5 text-blue-600" />
                  Engagement Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="p-5 bg-white rounded-xl border border-blue-100">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {recommendations.engagement_strategy}
                  </p>
                </div>
                
                {analysisData && (
                  <div className="space-y-3 mt-4">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                      <p className="text-xs font-semibold text-blue-900 mb-2">Key Insights:</p>
                      <ul className="text-xs text-slate-700 space-y-1">
                        {analysisData.topCategories && analysisData.topCategories.length > 0 && (
                          <li>✓ Prefers: {analysisData.topCategories.join(", ")}</li>
                        )}
                        <li>✓ Segment: {analysisData.segment} tier customer</li>
                        <li>✓ Price Range: {analysisData.priceRange}</li>
                        <li>✓ Avg Confidence: {analysisData.avgConfidence}%</li>
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-50 to-slate-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-5 h-5 text-slate-600" />
                DWM Algorithm Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-xl border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Pattern Mining</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Analyzed purchase history, category preferences, and price distribution patterns
                  </p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Collaborative Filtering</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Item-based similarity using category, price, and product name analysis
                  </p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Segment Analysis</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {selectedCustomer.segment} segment behavior with dynamic price affinity scoring
                  </p>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-slate-700">
                  <strong className="text-blue-900">Confidence:</strong> Category (35%) + Collaborative (30%) + Segment (25%) + Popularity (10%)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}