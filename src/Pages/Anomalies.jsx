import React, { useState, useEffect } from "react";
import { Transaction } from "@/Entities/all";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Sparkles, RefreshCw, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { InvokeLLM } from "@/integrations/Core";
import { format } from "date-fns";

export default function Anomalies() {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [anomalies, setAnomalies] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const data = await Transaction.list('-transaction_date', 100);
    console.log('📊 Loaded transactions:', data.length);
    setTransactions(data);
    setIsLoading(false);
  };

  // Enhanced statistical analysis
  const calculateStatistics = (transactions) => {
    const amounts = transactions
      .map(t => parseFloat(t.total_amount || 0))
      .filter(a => a > 0);
    
    if (amounts.length === 0) return null;

    const mean = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
    const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    
    const sortedAmounts = [...amounts].sort((a, b) => a - b);
    const q1 = sortedAmounts[Math.floor(sortedAmounts.length * 0.25)];
    const q3 = sortedAmounts[Math.floor(sortedAmounts.length * 0.75)];
    const iqr = q3 - q1;
    
    return {
      mean,
      stdDev,
      median: sortedAmounts[Math.floor(sortedAmounts.length * 0.5)],
      q1,
      q3,
      iqr,
      lowerBound: q1 - (1.5 * iqr),
      upperBound: q3 + (1.5 * iqr),
      extremeLower: mean - (2.5 * stdDev),
      extremeUpper: mean + (2.5 * stdDev)
    };
  };

  // Statistical anomaly detection
  const detectStatisticalAnomalies = (transactions, stats) => {
    if (!stats) return [];
    
    const anomalies = [];
    const customerFrequency = new Map();
    
    transactions.forEach(txn => {
      const amount = parseFloat(txn.total_amount || 0);
      const customer = txn.customer_name || 'Unknown';
      
      // Track customer frequency
      customerFrequency.set(customer, (customerFrequency.get(customer) || 0) + 1);
      
      const flags = [];
      let severity = 'Low';
      let anomalyType = 'Normal';
      
      // Check extreme outliers first (high severity)
      if (amount > stats.extremeUpper) {
        flags.push(`Extremely high amount: $${amount.toFixed(2)} (>${(stats.extremeUpper).toFixed(2)})`);
        severity = 'High';
        anomalyType = 'Extreme High Value';
      } else if (amount > stats.upperBound) {
        flags.push(`Unusually high amount: $${amount.toFixed(2)} (>${stats.upperBound.toFixed(2)})`);
        severity = amount > stats.mean * 2 ? 'High' : 'Medium';
        anomalyType = 'High Value Transaction';
      }
      
      if (amount < stats.lowerBound && amount > 0) {
        flags.push(`Unusually low amount: $${amount.toFixed(2)} (<${stats.lowerBound.toFixed(2)})`);
        anomalyType = 'Low Value Transaction';
        severity = 'Low';
      }
      
      // Check for zero or negative amounts
      if (amount <= 0) {
        flags.push(`Invalid amount: $${amount}`);
        severity = 'High';
        anomalyType = 'Invalid Transaction';
      }
      
      // Check for suspiciously round numbers
      if (amount >= 500 && amount % 100 === 0) {
        flags.push(`Suspiciously round amount: $${amount}`);
        if (severity === 'Low') severity = 'Medium';
        if (!anomalyType || anomalyType === 'Normal') anomalyType = 'Round Number Pattern';
      }
      
      // Parse and check items
      try {
        let items = [];
        if (typeof txn.items === 'string') {
          items = JSON.parse(txn.items);
        } else if (Array.isArray(txn.items)) {
          items = txn.items;
        }
        
        if (items.length === 0) {
          flags.push('No items in transaction');
          severity = 'Medium';
          if (!anomalyType || anomalyType === 'Normal') anomalyType = 'Missing Items';
        }
        
        if (items.length === 1 && amount > stats.mean * 1.5) {
          flags.push(`Single high-value item: $${amount}`);
          if (severity === 'Low') severity = 'Medium';
        }
        
        if (items.length > 15) {
          flags.push(`Bulk purchase: ${items.length} items`);
          if (!anomalyType || anomalyType === 'Normal') anomalyType = 'Bulk Purchase';
        }
      } catch (e) {
        flags.push('Invalid items data format');
        if (severity === 'Low') severity = 'Medium';
        if (!anomalyType || anomalyType === 'Normal') anomalyType = 'Data Quality Issue';
      }
      
      // Only add if anomalies detected
      if (flags.length > 0) {
        anomalies.push({
          transaction_id: txn.transaction_id,
          customer_name: customer,
          amount: amount,
          anomaly_type: anomalyType,
          severity: severity,
          reason: flags.join('. '),
          z_score: ((amount - stats.mean) / stats.stdDev).toFixed(2)
        });
      }
    });
    
    // Check for frequent customer activity
    customerFrequency.forEach((count, customer) => {
      if (count >= 5) {
        const customerTxns = transactions.filter(t => t.customer_name === customer);
        customerTxns.slice(0, 1).forEach(txn => {
          const existingAnomaly = anomalies.find(a => a.transaction_id === txn.transaction_id);
          if (existingAnomaly) {
            existingAnomaly.reason += `. Customer has ${count} transactions in dataset (potential card testing)`;
            if (existingAnomaly.severity === 'Low') existingAnomaly.severity = 'Medium';
          }
        });
      }
    });
    
    return anomalies;
  };

  const detectAnomalies = async () => {
    setIsDetecting(true);

    try {
      // Calculate statistics
      const stats = calculateStatistics(transactions);
      console.log('📈 Statistics:', stats);
      
      if (!stats) {
        console.warn('⚠️ No valid transaction data for statistics');
        setAnomalies({
          anomalous_transactions: [],
          patterns_detected: ['Insufficient data for analysis'],
          fraud_risk_score: 0,
          investigation_priority: 'Low'
        });
        setIsDetecting(false);
        return;
      }

      // Run statistical detection
      const statisticalAnomalies = detectStatisticalAnomalies(transactions, stats);
      console.log('🔍 Statistical anomalies found:', statisticalAnomalies.length);

      // Prepare transaction data with better context
      const transactionData = transactions.slice(0, 50).map(t => {
        let itemCount = 0;
        try {
          const items = typeof t.items === 'string' ? JSON.parse(t.items) : t.items;
          itemCount = Array.isArray(items) ? items.length : 0;
        } catch (e) {
          itemCount = 0;
        }
        
        return {
          id: t.transaction_id,
          amount: parseFloat(t.total_amount || 0).toFixed(2),
          items_count: itemCount,
          customer: t.customer_name,
          date: t.transaction_date,
          payment_method: t.payment_method,
          status: t.status
        };
      });

      // Enhanced LLM prompt with statistical context
      const result = await InvokeLLM({
        prompt: `You are a fraud detection expert. Analyze these retail transactions for anomalies.

STATISTICAL BASELINE:
- Mean transaction amount: $${stats.mean.toFixed(2)}
- Median: $${stats.median.toFixed(2)}
- Standard deviation: $${stats.stdDev.toFixed(2)}
- Normal range: $${stats.lowerBound.toFixed(2)} to $${stats.upperBound.toFixed(2)}
- Total transactions analyzed: ${transactions.length}

TRANSACTIONS TO REVIEW:
${JSON.stringify(transactionData, null, 2)}

ALREADY FLAGGED BY STATISTICAL ANALYSIS (${statisticalAnomalies.length} anomalies):
${JSON.stringify(statisticalAnomalies.slice(0, 10).map(a => ({
  id: a.transaction_id,
  amount: a.amount,
  type: a.anomaly_type,
  severity: a.severity,
  reason: a.reason
})), null, 2)}

YOUR TASK:
1. Review the statistically flagged transactions and provide detailed fraud analysis
2. Identify any additional suspicious patterns not caught by statistics
3. Look for: duplicate transactions, unusual customer behavior, payment method patterns, time-based patterns
4. Assign severity levels: High (immediate risk), Medium (investigate), Low (monitor)
5. Calculate an overall fraud risk score (0-100)

Be thorough - flag anything that deviates significantly from the statistical baseline or shows suspicious patterns.`,
        response_json_schema: {
          type: "object",
          properties: {
            anomalous_transactions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  transaction_id: { type: "string" },
                  anomaly_type: { type: "string" },
                  severity: { type: "string", enum: ["Low", "Medium", "High"] },
                  reason: { type: "string" },
                  recommendation: { type: "string" }
                },
                required: ["transaction_id", "anomaly_type", "severity", "reason", "recommendation"]
              }
            },
            patterns_detected: { 
              type: "array", 
              items: { type: "string" }
            },
            fraud_risk_score: { 
              type: "number",
              minimum: 0,
              maximum: 100
            },
            investigation_priority: { 
              type: "string",
              enum: ["Low", "Medium", "High"]
            }
          },
          required: ["anomalous_transactions", "patterns_detected", "fraud_risk_score", "investigation_priority"]
        }
      });

      console.log('✅ LLM Analysis complete:', result);

      // If LLM returns no anomalies but we have statistical ones, use statistical
      if ((!result.anomalous_transactions || result.anomalous_transactions.length === 0) && statisticalAnomalies.length > 0) {
        console.log('⚠️ LLM found no anomalies, using statistical detection');
        setAnomalies({
          anomalous_transactions: statisticalAnomalies.map(a => ({
            transaction_id: a.transaction_id,
            anomaly_type: a.anomaly_type,
            severity: a.severity,
            reason: a.reason,
            recommendation: `Statistical analysis flagged this transaction. Z-score: ${a.z_score}. Review transaction details and customer history.`
          })),
          patterns_detected: [
            `${statisticalAnomalies.length} transactions outside normal range`,
            `Normal transaction range: $${stats.lowerBound.toFixed(2)} - $${stats.upperBound.toFixed(2)}`,
            `Mean: $${stats.mean.toFixed(2)}, Std Dev: $${stats.stdDev.toFixed(2)}`
          ],
          fraud_risk_score: Math.min(100, statisticalAnomalies.length * 5 + (statisticalAnomalies.filter(a => a.severity === 'High').length * 10)),
          investigation_priority: statisticalAnomalies.filter(a => a.severity === 'High').length > 0 ? 'High' : 
                                 statisticalAnomalies.length > 3 ? 'Medium' : 'Low'
        });
      } else {
        setAnomalies(result);
      }

    } catch (error) {
      console.error("❌ Error detecting anomalies:", error);
      
      // Fallback to pure statistical detection
      const stats = calculateStatistics(transactions);
      const statisticalAnomalies = detectStatisticalAnomalies(transactions, stats);
      
      setAnomalies({
        anomalous_transactions: statisticalAnomalies.map(a => ({
          transaction_id: a.transaction_id,
          anomaly_type: a.anomaly_type,
          severity: a.severity,
          reason: a.reason,
          recommendation: `Flagged by statistical analysis (Z-score: ${a.z_score}). Manual review recommended.`
        })),
        patterns_detected: ['Statistical analysis completed', 'LLM analysis unavailable'],
        fraud_risk_score: Math.min(100, statisticalAnomalies.length * 5),
        investigation_priority: statisticalAnomalies.length > 5 ? 'High' : statisticalAnomalies.length > 2 ? 'Medium' : 'Low'
      });
    }

    setIsDetecting(false);
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <Skeleton className="h-12 w-64 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Anomaly Detection
          </h1>
          <p className="text-slate-600">AI-powered fraud detection and unusual pattern identification</p>
        </div>
        <Button 
          onClick={detectAnomalies}
          disabled={isDetecting}
          className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700"
        >
          {isDetecting ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Detect Anomalies
            </>
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 mb-1">Transactions Scanned</p>
            <p className="text-3xl font-bold text-slate-900">{transactions.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg shadow-rose-200/50 bg-gradient-to-br from-rose-50 to-pink-50">
          <CardContent className="p-6">
            <p className="text-sm text-rose-600 mb-1">Flagged Anomalies</p>
            <p className="text-3xl font-bold text-rose-600">
              {anomalies?.anomalous_transactions?.length || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg shadow-amber-200/50 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-6">
            <p className="text-sm text-amber-600 mb-1">Fraud Risk Score</p>
            <p className="text-3xl font-bold text-amber-600">
              {anomalies?.fraud_risk_score || 0}%
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg shadow-emerald-200/50 bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-6">
            <p className="text-sm text-emerald-600 mb-1">Clean Transactions</p>
            <p className="text-3xl font-bold text-emerald-600">
              {transactions.length - (anomalies?.anomalous_transactions?.length || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Anomalies List */}
      {anomalies && (
        <div className="space-y-6">
          {anomalies.anomalous_transactions?.length > 0 ? (
            <Card className="border-0 shadow-lg shadow-slate-200/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  Detected Anomalies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {anomalies.anomalous_transactions.map((anomaly, index) => {
                  const transaction = transactions.find(t => t.transaction_id === anomaly.transaction_id);
                  const severityColor = {
                    High: 'from-rose-500 to-red-600',
                    Medium: 'from-amber-500 to-orange-600',
                    Low: 'from-blue-500 to-cyan-600'
                  }[anomaly.severity] || 'from-slate-500 to-slate-600';

                  return (
                    <div key={index} className="p-5 rounded-xl border-2 border-rose-200 bg-gradient-to-r from-rose-50 to-transparent">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg text-slate-900">
                              Transaction #{anomaly.transaction_id}
                            </h3>
                            <Badge className={`bg-gradient-to-r ${severityColor} text-white`}>
                              {anomaly.severity} Severity
                            </Badge>
                          </div>
                          {transaction && (
                            <div className="flex gap-4 text-sm text-slate-600">
                              <span>Customer: {transaction.customer_name}</span>
                              <span>Amount: ${transaction.total_amount}</span>
                              <span>{format(new Date(transaction.transaction_date), 'MMM d, yyyy')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-sm font-semibold text-slate-700 mb-1">Anomaly Type:</p>
                          <p className="text-sm text-slate-600">{anomaly.anomaly_type}</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-sm font-semibold text-slate-700 mb-1">Reason:</p>
                          <p className="text-sm text-slate-600">{anomaly.reason}</p>
                        </div>
                        <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                          <p className="text-sm font-semibold text-blue-900 mb-1">Recommendation:</p>
                          <p className="text-sm text-blue-800">{anomaly.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-lg shadow-emerald-200/50 bg-gradient-to-br from-emerald-50 to-teal-50">
              <CardContent className="p-12 text-center">
                <Shield className="w-16 h-16 mx-auto mb-4 text-emerald-600" />
                <h3 className="text-2xl font-bold text-emerald-900 mb-2">All Clear!</h3>
                <p className="text-emerald-700">No anomalies detected in recent transactions</p>
              </CardContent>
            </Card>
          )}

          {/* Patterns and Insights */}
          <div className="grid lg:grid-cols-2 gap-6">
            {anomalies.patterns_detected && anomalies.patterns_detected.length > 0 && (
              <Card className="border-0 shadow-lg shadow-slate-200/50">
                <CardHeader>
                  <CardTitle>Detected Patterns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {anomalies.patterns_detected.map((pattern, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2" />
                        <p className="text-sm text-slate-700">{pattern}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-0 shadow-lg shadow-amber-200/50 bg-gradient-to-br from-amber-50 to-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Investigation Priority
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <Badge className={`text-lg px-4 py-2 ${
                    anomalies.investigation_priority === 'High' ? 'bg-rose-500' :
                    anomalies.investigation_priority === 'Medium' ? 'bg-amber-500' :
                    'bg-blue-500'
                  } text-white`}>
                    {anomalies.investigation_priority} Priority
                  </Badge>
                </div>
                <p className="text-sm text-slate-700 text-center">
                  Based on detected patterns and severity levels
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
