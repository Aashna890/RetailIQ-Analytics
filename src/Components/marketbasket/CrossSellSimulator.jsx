import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Plus, X, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CrossSellSimulator({ products, rules, onSimulate }) {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const addProduct = (productName) => {
    if (!selectedProducts.includes(productName)) {
      setSelectedProducts([...selectedProducts, productName]);
    }
  };

  const removeProduct = (productName) => {
    setSelectedProducts(selectedProducts.filter(p => p !== productName));
  };

  const runSimulation = async () => {
    setIsSimulating(true);
    
    // Find applicable rules
    const applicableRules = rules.filter(rule => 
      rule.antecedent.every(item => selectedProducts.includes(item))
    );

    // Score recommendations
    const scores = {};
    applicableRules.forEach(rule => {
      rule.consequent.forEach(item => {
        if (!selectedProducts.includes(item)) {
          const score = rule.confidence * rule.lift * rule.support;
          scores[item] = Math.max(scores[item] || 0, score);
        }
      });
    });

    const recs = Object.entries(scores)
      .map(([item, score]) => ({
        product: item,
        score: score,
        confidence: applicableRules.find(r => r.consequent.includes(item))?.confidence || 0,
        lift: applicableRules.find(r => r.consequent.includes(item))?.lift || 0
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    setRecommendations(recs);
    
    if (onSimulate) {
      await onSimulate(selectedProducts, recs);
    }
    
    setIsSimulating(false);
  };

  return (
    <Card className="border-0 shadow-lg shadow-blue-200/50 bg-gradient-to-br from-blue-50 to-cyan-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          Cross-Sell Simulator
        </CardTitle>
        <p className="text-sm text-slate-600 mt-1">Test recommendations for specific product combinations</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Product Selection */}
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-2 block">
            Select Products in Cart
          </label>
          <Select onValueChange={addProduct}>
            <SelectTrigger>
              <SelectValue placeholder="Add product to cart..." />
            </SelectTrigger>
            <SelectContent>
              {products
                .filter(p => !selectedProducts.includes(p))
                .map((product, idx) => (
                  <SelectItem key={idx} value={product}>
                    {product}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {selectedProducts.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedProducts.map((product, idx) => (
                <Badge key={idx} className="bg-blue-100 text-blue-800 border border-blue-200 pr-1">
                  {product}
                  <button
                    onClick={() => removeProduct(product)}
                    className="ml-2 hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Simulate Button */}
        <Button
          onClick={runSimulation}
          disabled={selectedProducts.length === 0 || isSimulating}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
        >
          {isSimulating ? (
            <>
              <Sparkles className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Recommendations
            </>
          )}
        </Button>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="p-5 bg-white rounded-xl shadow-sm border-2 border-blue-200">
            <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Recommended Cross-Sell Products
            </h3>
            <div className="space-y-3">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <span className="font-semibold text-slate-900">{rec.product}</span>
                    </div>
                    <Badge className="bg-blue-600 text-white">
                      Score: {(rec.score * 100).toFixed(1)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="text-xs">
                      <span className="text-slate-500">Confidence:</span>
                      <span className="ml-2 font-bold text-slate-700">{(rec.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-slate-500">Lift:</span>
                      <span className="ml-2 font-bold text-slate-700">{rec.lift.toFixed(2)}x</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedProducts.length === 0 && (
          <div className="text-center p-8 bg-white rounded-xl border-2 border-dashed border-blue-200">
            <Plus className="w-12 h-12 mx-auto text-blue-300 mb-3" />
            <p className="text-slate-500">Add products to cart to see cross-sell recommendations</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}