import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";

export default function MetricsExplainer() {
  return (
    <Card className="border-0 shadow-lg shadow-indigo-200/50 bg-gradient-to-br from-indigo-50 to-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5 text-indigo-600" />
          Understanding Association Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-white rounded-lg">
          <h4 className="font-bold text-slate-900 mb-2">Support</h4>
          <p className="text-sm text-slate-600 leading-relaxed">
            Measures how frequently items appear together in transactions. Higher support = more common pattern.
          </p>
          <code className="block mt-2 p-2 bg-slate-50 rounded text-xs">
            Support(A → B) = Transactions containing (A and B) / Total transactions
          </code>
        </div>

        <div className="p-4 bg-white rounded-lg">
          <h4 className="font-bold text-slate-900 mb-2">Confidence</h4>
          <p className="text-sm text-slate-600 leading-relaxed">
            Probability that B is purchased when A is purchased. Confidence of 70% means 7 out of 10 customers who buy A also buy B.
          </p>
          <code className="block mt-2 p-2 bg-slate-50 rounded text-xs">
            Confidence(A → B) = Transactions with (A and B) / Transactions with A
          </code>
        </div>

        <div className="p-4 bg-white rounded-lg">
          <h4 className="font-bold text-slate-900 mb-2">Lift</h4>
          <p className="text-sm text-slate-600 leading-relaxed">
            Measures how much more likely B is purchased when A is purchased, compared to B being purchased randomly.
            Lift {">"} 1 = positive correlation, Lift = 1 = independent, Lift {"<"} 1 = negative correlation.
          </p>
          <code className="block mt-2 p-2 bg-slate-50 rounded text-xs">
            Lift(A → B) = Confidence(A → B) / Support(B)
          </code>
        </div>

        <div className="p-4 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg">
          <h4 className="font-bold text-emerald-900 mb-2">Actionable Rules</h4>
          <ul className="text-sm text-emerald-800 space-y-1 list-disc list-inside">
            <li>Support {">"} 2% (frequent enough)</li>
            <li>Confidence {">"} 30% (reliable pattern)</li>
            <li>Lift {">"} 1.2 (meaningful association)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}