import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gift, Sparkles, ShoppingCart } from "lucide-react";

export default function BundleRecommendations({ bundles }) {
  return (
    <Card className="border-0 shadow-lg shadow-emerald-200/50 bg-gradient-to-br from-emerald-50 to-teal-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-emerald-600" />
          AI-Generated Product Bundles
        </CardTitle>
        <p className="text-sm text-slate-600 mt-1">Optimized bundles based on purchase patterns</p>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          {bundles.map((bundle, index) => (
            <div key={index} className="p-5 bg-white rounded-xl shadow-md border-2 border-emerald-200 hover:border-emerald-400 transition-all">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg text-slate-900">{bundle.name}</h3>
                <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-lg px-3 py-1">
                  {bundle.discount}% OFF
                </Badge>
              </div>

              <div className="space-y-2 mb-4">
                {bundle.products.map((product, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg">
                    <ShoppingCart className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-slate-700">{product.name}</span>
                    <span className="ml-auto text-sm text-slate-500">${product.price}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-emerald-200 pt-3 mb-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Bundle Price:</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-emerald-600">${bundle.bundlePrice}</span>
                    <span className="text-sm text-slate-500 line-through ml-2">${bundle.originalPrice}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-100 rounded-lg mb-3">
                <p className="text-xs text-emerald-800 leading-relaxed">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  {bundle.reasoning}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-50 rounded">
                  <div className="font-bold text-slate-700">{(bundle.confidence * 100).toFixed(0)}%</div>
                  <div className="text-slate-500">Confidence</div>
                </div>
                <div className="p-2 bg-slate-50 rounded">
                  <div className="font-bold text-slate-700">{bundle.lift.toFixed(1)}x</div>
                  <div className="text-slate-500">Lift</div>
                </div>
                <div className="p-2 bg-slate-50 rounded">
                  <div className="font-bold text-slate-700">{bundle.frequency}</div>
                  <div className="text-slate-500">Sold Together</div>
                </div>
              </div>

              <Button className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                Create Bundle Offer
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}