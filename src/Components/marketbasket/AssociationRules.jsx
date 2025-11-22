import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Filter, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AssociationRules({ rules }) {
  const [minConfidence, setMinConfidence] = useState(0);
  const [minLift, setMinLift] = useState(1);
  const [sortBy, setSortBy] = useState('confidence');

  const filteredRules = rules
    .filter(r => r.confidence >= minConfidence && r.lift >= minLift)
    .sort((a, b) => b[sortBy] - a[sortBy]);

  const getLiftColor = (lift) => {
    if (lift >= 2) return 'from-emerald-500 to-green-600';
    if (lift >= 1.5) return 'from-blue-500 to-cyan-600';
    return 'from-amber-500 to-orange-600';
  };

  const getConfidenceColor = (conf) => {
    if (conf >= 0.7) return 'bg-emerald-100 text-emerald-800';
    if (conf >= 0.5) return 'bg-blue-100 text-blue-800';
    return 'bg-amber-100 text-amber-800';
  };

  return (
    <Card className="border-0 shadow-lg shadow-slate-200/50">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
              Association Rules
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              {filteredRules.length} rules (filtered from {rules.length})
            </p>
          </div>
          
          <div className="flex gap-3">
            <Select value={String(minConfidence)} onValueChange={(v) => setMinConfidence(Number(v))}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Min Confidence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All Confidence</SelectItem>
                <SelectItem value="0.3">≥ 30%</SelectItem>
                <SelectItem value="0.5">≥ 50%</SelectItem>
                <SelectItem value="0.7">≥ 70%</SelectItem>
              </SelectContent>
            </Select>

            <Select value={String(minLift)} onValueChange={(v) => setMinLift(Number(v))}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Min Lift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Lift ≥ 1</SelectItem>
                <SelectItem value="1.5">Lift ≥ 1.5</SelectItem>
                <SelectItem value="2">Lift ≥ 2</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confidence">Confidence</SelectItem>
                <SelectItem value="lift">Lift</SelectItem>
                <SelectItem value="support">Support</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">If Customer Buys</TableHead>
                <TableHead className="w-12"></TableHead>
                <TableHead className="font-semibold">Then Also Buys</TableHead>
                <TableHead className="text-center">Support</TableHead>
                <TableHead className="text-center">Confidence</TableHead>
                <TableHead className="text-center">Lift</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules.slice(0, 20).map((rule, index) => (
                <TableRow key={index} className="hover:bg-indigo-50/50">
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {rule.antecedent.map((item, idx) => (
                        <Badge key={idx} variant="outline" className="bg-white">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ArrowRight className="w-4 h-4 text-indigo-500" />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {rule.consequent.map((item, idx) => (
                        <Badge key={idx} variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-medium text-slate-700">
                      {(rule.support * 100).toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={getConfidenceColor(rule.confidence)}>
                      {(rule.confidence * 100).toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className={`inline-flex px-3 py-1 rounded-full bg-gradient-to-r ${getLiftColor(rule.lift)} text-white font-bold text-sm shadow-sm`}>
                      {rule.lift.toFixed(2)}x
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredRules.length === 0 && (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No rules match your filters. Try adjusting the thresholds.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
