import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function FrequentItemsets({ itemsets }) {
  const maxSupport = Math.max(...itemsets.map(i => i.support));

  return (
    <Card className="border-0 shadow-lg shadow-slate-200/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-amber-600" />
          Frequent Itemsets
        </CardTitle>
        <p className="text-sm text-slate-500 mt-1">Products frequently purchased together</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {itemsets.map((itemset, index) => (
            <div key={index} className="p-4 rounded-xl border-2 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 transition-all">
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-wrap gap-2">
                  {itemset.items.map((item, idx) => (
                    <Badge key={idx} className="bg-amber-100 text-amber-800 border border-amber-200">
                      {item}
                    </Badge>
                  ))}
                </div>
                <Badge className="bg-slate-100 text-slate-700">
                  {itemset.items.length} items
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Support</span>
                  <span className="font-bold text-amber-600">{(itemset.support * 100).toFixed(2)}%</span>
                </div>
                <Progress value={(itemset.support / maxSupport) * 100} className="h-2" />
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>Appears in {itemset.count} transactions</span>
                  {itemset.support > 0.1 && (
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <TrendingUp className="w-3 h-3" /> High frequency
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}