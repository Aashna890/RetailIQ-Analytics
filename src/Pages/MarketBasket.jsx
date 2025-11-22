import React, { useState, useEffect } from "react";
import { Transaction, Product } from "@/Entities/all";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Sparkles, RefreshCw, TrendingUp, Network, BarChart3, Upload } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { InvokeLLM, setGlobalTransactions, setGlobalProducts } from "@/integrations/Core";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FrequentItemsets from "@/Components/marketbasket/FrequentItemsets";
import AssociationRules from "@/Components/marketbasket/AssociationRules";
import BundleRecommendations from "@/Components/marketbasket/BundleRecommendations";
import CrossSellSimulator from "@/Components/marketbasket/CrossSellSimulator";
import MetricsExplainer from "@/Components/marketbasket/MetricsExplainer";

export default function MarketBasket() {
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [frequentItemsets, setFrequentItemsets] = useState([]);
  const [associationRules, setAssociationRules] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [insights, setInsights] = useState(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [transData, prodData] = await Promise.all([
      Transaction.list('-transaction_date', 200),
      Product.list()
    ]);
    
    console.log('📦 Loaded data:', {
      transactions: transData.length,
      products: prodData.length
    });
    
    setTransactions(transData);
    setProducts(prodData);
    
    // ✅ Store data globally for ML backend
    setGlobalTransactions(transData);
    setGlobalProducts(prodData);
    
    setIsLoading(false);
  };

  // ✅ FIXED: Parse items JSON string properly
  const parseTransactionItems = (transaction) => {
    let items = [];
    
    if (typeof transaction.items === 'string') {
      try {
        items = JSON.parse(transaction.items);
      } catch (e) {
        console.warn('Failed to parse items JSON:', e);
        items = [];
      }
    } else if (Array.isArray(transaction.items)) {
      items = transaction.items;
    }
    
    return items.map(i => i.product_name).filter(Boolean);
  };

  const calculateFrequentItemsets = (transactions, minSupport = 0.05) => {
    const itemsets = new Map();
    const totalTransactions = transactions.length;

    console.log('🔍 Calculating frequent itemsets from', totalTransactions, 'transactions');

    // Count single items
    transactions.forEach(t => {
      const items = parseTransactionItems(t);
      const uniqueItems = [...new Set(items)];
      uniqueItems.forEach(item => {
        itemsets.set(item, (itemsets.get(item) || 0) + 1);
      });
    });

    // Count pairs
    transactions.forEach(t => {
      const items = parseTransactionItems(t);
      const uniqueItems = [...new Set(items)];
      if (uniqueItems.length < 2) return;
      
      for (let i = 0; i < uniqueItems.length; i++) {
        for (let j = i + 1; j < uniqueItems.length; j++) {
          const pair = [uniqueItems[i], uniqueItems[j]].sort().join('|');
          itemsets.set(pair, (itemsets.get(pair) || 0) + 1);
        }
      }
    });

    // Filter by support and format
    const result = [];
    itemsets.forEach((count, key) => {
      const support = count / totalTransactions;
      if (support >= minSupport) {
        result.push({
          items: key.split('|'),
          count,
          support
        });
      }
    });

    console.log('✅ Found', result.length, 'frequent itemsets');
    return result.sort((a, b) => b.support - a.support);
  };

  const calculateAssociationRules = (transactions, minConfidence = 0.2) => {
    const rules = [];
    const totalTransactions = transactions.length;

    console.log('🔍 Calculating association rules from', totalTransactions, 'transactions');

    // Get item counts
    const itemCounts = new Map();
    const pairCounts = new Map();

    transactions.forEach(t => {
      const items = [...new Set(parseTransactionItems(t))];
      
      items.forEach(item => {
        itemCounts.set(item, (itemCounts.get(item) || 0) + 1);
      });

      for (let i = 0; i < items.length; i++) {
        for (let j = 0; j < items.length; j++) {
          if (i !== j) {
            const key = `${items[i]}→${items[j]}`;
            pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
          }
        }
      }
    });

    // Calculate rules
    pairCounts.forEach((pairCount, key) => {
      const [antecedent, consequent] = key.split('→');
      const antecedentCount = itemCounts.get(antecedent) || 1;
      const consequentCount = itemCounts.get(consequent) || 1;
      
      const support = pairCount / totalTransactions;
      const confidence = pairCount / antecedentCount;
      const lift = confidence / (consequentCount / totalTransactions);

      if (confidence >= minConfidence && lift > 1) {
        rules.push({
          antecedent: [antecedent],
          consequent: [consequent],
          support,
          confidence,
          lift
        });
      }
    });

    console.log('✅ Found', rules.length, 'association rules');
    return rules.sort((a, b) => b.confidence - a.confidence);
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    console.log('🚀 Starting Market Basket Analysis...');

    // Calculate frequent itemsets
    const itemsets = calculateFrequentItemsets(transactions, 0.03);
    setFrequentItemsets(itemsets);

    // Calculate association rules
    const rules = calculateAssociationRules(transactions, 0.2);
    setAssociationRules(rules);

    console.log('📊 Analysis results:', {
      itemsets: itemsets.length,
      rules: rules.length
    });

    // Generate AI insights and bundles
    try {
      const topRules = rules.slice(0, 15).map(r => ({
        from: r.antecedent.join(', '),
        to: r.consequent.join(', '),
        confidence: (r.confidence * 100).toFixed(1) + '%',
        lift: r.lift.toFixed(2)
      }));

      console.log('🤖 Calling ML backend for bundle recommendations...');

      const result = await InvokeLLM({
        prompt: `Analyze these market basket association rules and create actionable product bundles:

Top Association Rules:
${JSON.stringify(topRules, null, 2)}

Products Available:
${products.slice(0, 30).map(p => `${p.product_name} ($${p.price})`).join(', ')}

Provide:
1. 4 strategic product bundles with:
   - Bundle name
   - Products to include
   - Recommended discount percentage (10-25%)
   - Reasoning based on the rules
   - Estimated confidence and lift
   - How many times products were bought together
2. Strategic insights for cross-selling
3. Recommendations for store layout/placement`,
        response_json_schema: {
          type: "object",
          properties: {
            bundles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  products: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        price: { type: "number" }
                      }
                    }
                  },
                  discount: { type: "number" },
                  reasoning: { type: "string" },
                  confidence: { type: "number" },
                  lift: { type: "number" },
                  frequency: { type: "number" }
                }
              }
            },
            cross_sell_strategy: { type: "string" },
            layout_recommendations: { type: "string" }
          }
        }
      });

      console.log('✅ Received bundle recommendations:', result);

      // Calculate bundle prices
      const enrichedBundles = result.bundles.map(bundle => {
        const originalPrice = bundle.products.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);
        const bundlePrice = originalPrice * (1 - bundle.discount / 100);
        return {
          ...bundle,
          originalPrice: originalPrice.toFixed(2),
          bundlePrice: bundlePrice.toFixed(2)
        };
      });

      setBundles(enrichedBundles);
      setInsights(result);
      setAnalysisComplete(true);
      
      console.log('🎉 Analysis complete!');
    } catch (error) {
      console.error("❌ Error generating insights:", error);
    }

    setIsAnalyzing(false);
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <Skeleton className="h-12 w-64 mb-6" />
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // Empty state
  if (transactions.length === 0) {
    return (
      <div className="p-6 md:p-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">
            Market Basket Analysis
          </h1>
          <p className="text-slate-600">Apriori & FP-Growth algorithms for product associations</p>
        </div>

        <div className="text-center p-12 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-dashed border-amber-200">
          <ShoppingBag className="w-16 h-16 mx-auto text-amber-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Transaction Data</h3>
          <p className="text-slate-600 mb-4">Upload transaction data to discover product associations</p>
          <Link to="/data-import">
            <button className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all">
              <Upload className="w-4 h-4 inline mr-2" />
              Import Transactions
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">
            Market Basket Analysis
          </h1>
          <p className="text-slate-600">Apriori & FP-Growth algorithms for product associations</p>
        </div>
        <Button 
          onClick={runAnalysis}
          disabled={isAnalyzing}
          className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Computing Rules...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Run MBA Analysis
            </>
          )}
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <ShoppingBag className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-slate-500">Transactions</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{transactions.length}</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Network className="w-5 h-5 text-indigo-600" />
              <span className="text-sm text-slate-500">Frequent Itemsets</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{frequentItemsets.length}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span className="text-sm text-slate-500">Association Rules</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{associationRules.length}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-slate-500">Product Bundles</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{bundles.length}</p>
          </CardContent>
        </Card>
      </div>

      {!analysisComplete ? (
        <Card className="border-0 shadow-lg shadow-amber-200/50 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-12 text-center">
            <Network className="w-16 h-16 mx-auto mb-4 text-amber-600" />
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Ready to Discover Patterns</h3>
            <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
              Run the Market Basket Analysis to discover frequent itemsets, generate association rules
              with support, confidence, and lift metrics, and get AI-powered bundle recommendations.
            </p>
            <Button 
              onClick={runAnalysis}
              size="lg"
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Start Analysis
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="rules" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1">
            <TabsTrigger value="rules" className="data-[state=active]:bg-amber-100">
              Association Rules
            </TabsTrigger>
            <TabsTrigger value="itemsets" className="data-[state=active]:bg-amber-100">
              Frequent Itemsets
            </TabsTrigger>
            <TabsTrigger value="bundles" className="data-[state=active]:bg-amber-100">
              Bundles
            </TabsTrigger>
            <TabsTrigger value="simulator" className="data-[state=active]:bg-amber-100">
              Simulator
            </TabsTrigger>
            <TabsTrigger value="metrics" className="data-[state=active]:bg-amber-100">
              Metrics Guide
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-6">
            <AssociationRules rules={associationRules} />
          </TabsContent>

          <TabsContent value="itemsets" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <FrequentItemsets itemsets={frequentItemsets.slice(0, 10)} />
              {insights && (
                <Card className="border-0 shadow-lg shadow-slate-200/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      Strategic Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
                      <h4 className="font-bold text-slate-900 mb-2">Cross-Sell Strategy</h4>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {insights.cross_sell_strategy}
                      </p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl">
                      <h4 className="font-bold text-slate-900 mb-2">Layout Recommendations</h4>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {insights.layout_recommendations}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="bundles" className="space-y-6">
            <BundleRecommendations bundles={bundles} />
          </TabsContent>

          <TabsContent value="simulator" className="space-y-6">
            <CrossSellSimulator 
              products={[...new Set(transactions.flatMap(t => parseTransactionItems(t)))]}
              rules={associationRules}
            />
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            <MetricsExplainer />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}