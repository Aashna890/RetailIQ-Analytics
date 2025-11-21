import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Package } from "lucide-react";

export default function TopProducts({ products }) {
  return (
    <Card className="border-0 shadow-lg shadow-slate-200/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-indigo-600" />
          Top Selling Products
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products.map((product, index) => (
            <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-slate-50 to-transparent hover:from-indigo-50 transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                  index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                  index === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-600' :
                  index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                  'bg-gradient-to-br from-indigo-400 to-indigo-600'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{product.name}</p>
                  <p className="text-sm text-slate-500">{product.category}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">${product.revenue?.toLocaleString()}</p>
                <Badge className="mt-1 bg-emerald-100 text-emerald-700 border-emerald-200">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {product.units} sold
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}