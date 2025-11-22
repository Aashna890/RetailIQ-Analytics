import React, { useState, useEffect } from "react";
import { Customer, Transaction } from "@/Entities/all";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, AlertCircle, Sparkles, RefreshCw, Upload } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { InvokeLLM, setGlobalCustomers } from "@/integrations/Core";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const SEGMENT_COLORS = {
  premium: '#10b981',
  regular: '#6366f1',
  budget: '#f59e0b',
  at_risk: '#ef4444'
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [segmentData, setSegmentData] = useState([]);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  // Deterministic K-Means Clustering Implementation with fixed seed
  const kMeansClustering = (data, k = 4, maxIterations = 100) => {
    if (data.length === 0) return [];
    
    // Deterministic initialization using K-Means++ algorithm
    const initializeCentroids = (data, k) => {
      const centroids = [];
      
      // First centroid: choose the point with median monetary value
      const sortedByMonetary = [...data].sort((a, b) => b.monetary - a.monetary);
      centroids.push({
        recency: sortedByMonetary[Math.floor(data.length / 2)].recency,
        frequency: sortedByMonetary[Math.floor(data.length / 2)].frequency,
        monetary: sortedByMonetary[Math.floor(data.length / 2)].monetary
      });
      
      // Select remaining centroids using K-Means++ (deterministic distance-based)
      while (centroids.length < k) {
        let maxDist = -1;
        let farthestPoint = null;
        
        data.forEach(point => {
          const minDistToCentroid = Math.min(...centroids.map(c => 
            Math.sqrt(
              Math.pow(point.recency - c.recency, 2) +
              Math.pow(point.frequency - c.frequency, 2) +
              Math.pow(point.monetary - c.monetary, 2)
            )
          ));
          
          if (minDistToCentroid > maxDist) {
            maxDist = minDistToCentroid;
            farthestPoint = point;
          }
        });
        
        if (farthestPoint) {
          centroids.push({
            recency: farthestPoint.recency,
            frequency: farthestPoint.frequency,
            monetary: farthestPoint.monetary
          });
        }
      }
      
      return centroids;
    };
    
    let centroids = initializeCentroids(data, k);
    let clusters = [];
    let iterations = 0;

    while (iterations < maxIterations) {
      // Assign points to nearest centroid
      clusters = Array(k).fill(null).map(() => []);
      
      data.forEach((point, idx) => {
        let minDistance = Infinity;
        let clusterIndex = 0;

        centroids.forEach((centroid, cIdx) => {
          const distance = Math.sqrt(
            Math.pow(point.recency - centroid.recency, 2) +
            Math.pow(point.frequency - centroid.frequency, 2) +
            Math.pow(point.monetary - centroid.monetary, 2)
          );

          if (distance < minDistance) {
            minDistance = distance;
            clusterIndex = cIdx;
          }
        });

        clusters[clusterIndex].push({ ...point, originalIndex: idx });
      });

      // Calculate new centroids
      let hasChanged = false;
      const newCentroids = clusters.map(cluster => {
        if (cluster.length === 0) return centroids[0]; // Handle empty clusters

        const newCentroid = {
          recency: cluster.reduce((sum, p) => sum + p.recency, 0) / cluster.length,
          frequency: cluster.reduce((sum, p) => sum + p.frequency, 0) / cluster.length,
          monetary: cluster.reduce((sum, p) => sum + p.monetary, 0) / cluster.length
        };

        return newCentroid;
      });

      // Check for convergence
      centroids.forEach((centroid, idx) => {
        if (Math.abs(centroid.recency - newCentroids[idx].recency) > 0.01 ||
            Math.abs(centroid.frequency - newCentroids[idx].frequency) > 0.01 ||
            Math.abs(centroid.monetary - newCentroids[idx].monetary) > 0.01) {
          hasChanged = true;
        }
      });

      centroids = newCentroids;
      iterations++;

      if (!hasChanged) break;
    }

    return clusters;
  };

  // RFM Analysis and Segmentation with deterministic assignment
  const performRFMAnalysis = (customersData, transactionsData) => {
    const now = new Date();
    
    // Calculate RFM scores
    const rfmData = customersData.map(customer => {
      // Recency: Days since last purchase
      const lastPurchaseDate = new Date(customer.last_purchase_date || now);
      const recency = Math.floor((now - lastPurchaseDate) / (1000 * 60 * 60 * 24));
      
      // Frequency: Number of purchases
      const frequency = parseInt(customer.total_purchases) || 0;
      
      // Monetary: Total amount spent
      const monetary = parseFloat(customer.total_spent) || 0;

      return {
        ...customer,
        recency: recency,
        frequency: frequency,
        monetary: monetary
      };
    });

    // Normalize RFM values for clustering
    const maxRecency = Math.max(...rfmData.map(c => c.recency), 1);
    const maxFrequency = Math.max(...rfmData.map(c => c.frequency), 1);
    const maxMonetary = Math.max(...rfmData.map(c => c.monetary), 1);

    const normalizedData = rfmData.map(c => ({
      ...c,
      recency: c.recency / maxRecency,
      frequency: c.frequency / maxFrequency,
      monetary: c.monetary / maxMonetary
    }));

    // Apply K-Means clustering with deterministic initialization
    const clusters = kMeansClustering(normalizedData, 4);

    // Sort clusters by average monetary value (high to low) for consistent ordering
    const clustersWithMetrics = clusters.map((cluster, idx) => {
      if (cluster.length === 0) return { cluster: [], avgMonetary: 0, avgRecency: 1, avgFrequency: 0 };

      const avgRecency = cluster.reduce((s, c) => s + c.recency, 0) / cluster.length;
      const avgFrequency = cluster.reduce((s, c) => s + c.frequency, 0) / cluster.length;
      const avgMonetary = cluster.reduce((s, c) => s + c.monetary, 0) / cluster.length;

      return {
        cluster: cluster,
        avgRecency: avgRecency,
        avgFrequency: avgFrequency,
        avgMonetary: avgMonetary
      };
    });

    // Sort by monetary value descending for consistent segment assignment
    clustersWithMetrics.sort((a, b) => b.avgMonetary - a.avgMonetary);

    // Assign segment names based on RFM characteristics and sorted order
    const segmentedClusters = clustersWithMetrics.map((clusterMetrics, idx) => {
      const { cluster, avgRecency, avgFrequency, avgMonetary } = clusterMetrics;
      
      if (cluster.length === 0) return { segment: 'regular', customers: [] };

      let segment = 'regular';
      
      // Deterministic segment assignment based on sorted clusters and RFM scores
      if (idx === 0 && avgMonetary > 0.5) {
        // Highest monetary cluster = Premium
        segment = 'premium';
      } else if (avgRecency > 0.6 && avgFrequency < 0.4) {
        // High recency (old), low frequency = At-Risk
        segment = 'at_risk';
      } else if (avgMonetary < 0.4) {
        // Low monetary = Budget
        segment = 'budget';
      } else {
        // Default = Regular
        segment = 'regular';
      }

      return {
        segment: segment,
        customers: cluster.map(c => ({
          ...rfmData[c.originalIndex],
          segment: segment
        })),
        avgMonetary: avgMonetary
      };
    });

    // Flatten and return all customers with segments
    const allSegmentedCustomers = segmentedClusters.flatMap(sc => sc.customers);
    
    console.log('✅ RFM Analysis Complete:', {
      totalCustomers: allSegmentedCustomers.length,
      segments: segmentedClusters.map(sc => ({ segment: sc.segment, count: sc.customers.length }))
    });

    return allSegmentedCustomers;
  };

  const loadCustomers = async () => {
    setIsLoading(true);
    
    try {
      let customersData = await Customer.list('-total_spent');
      const transactionsData = await Transaction.list();
      
      console.log('📊 Loaded data:', {
        customers: customersData.length,
        transactions: transactionsData.length
      });

      // Perform RFM analysis and K-Means clustering
      if (customersData.length > 0) {
        customersData = performRFMAnalysis(customersData, transactionsData);
      }

      setCustomers(customersData);
      
      // Store globally for ML backend
      setGlobalCustomers(customersData);
      
      // Calculate segment distribution
      const segments = customersData.reduce((acc, customer) => {
        const segment = customer.segment || 'regular';
        acc[segment] = (acc[segment] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(segments).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: SEGMENT_COLORS[name]
      }));

      setSegmentData(chartData);
    } catch (error) {
      console.error('❌ Error loading customers:', error);
    }
    
    setIsLoading(false);
  };

  const analyzeSegments = async () => {
    setIsAnalyzing(true);
    
    try {
      // Calculate segment statistics
      const segmentStats = {};
      
      ['premium', 'regular', 'budget', 'at_risk'].forEach(segment => {
        const segmentCustomers = customers.filter(c => c.segment === segment);
        
        if (segmentCustomers.length > 0) {
          const avgSpent = segmentCustomers.reduce((sum, c) => sum + (parseFloat(c.total_spent) || 0), 0) / segmentCustomers.length;
          const avgPurchases = segmentCustomers.reduce((sum, c) => sum + (parseInt(c.total_purchases) || 0), 0) / segmentCustomers.length;
          const avgRecency = segmentCustomers.reduce((sum, c) => sum + (c.recency || 0), 0) / segmentCustomers.length;
          
          segmentStats[segment] = {
            count: segmentCustomers.length,
            avg_spent: Math.round(avgSpent),
            avg_purchases: Math.round(avgPurchases * 10) / 10,
            avg_recency_days: Math.round(avgRecency),
            percentage: Math.round((segmentCustomers.length / customers.length) * 100)
          };
        }
      });

      const result = await InvokeLLM({
        prompt: `Analyze these customer segments based on RFM (Recency, Frequency, Monetary) analysis and K-Means clustering:

Total Customers: ${customers.length}

Segment Statistics:
${JSON.stringify(segmentStats, null, 2)}

Segment Definitions:
- Premium: High-value customers with recent purchases, high frequency, and high spending
- Regular: Moderate customers with consistent purchasing behavior
- Budget: Price-conscious customers with lower spending but moderate frequency
- At-Risk: Inactive customers with old last purchase dates and low frequency

Provide detailed analysis for each segment present in the data:
1. Key characteristics based on RFM metrics
2. Actionable recommendations to improve retention and revenue
3. Overall marketing strategy across all segments`,
        response_json_schema: {
          type: "object",
          properties: {
            segment_insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  segment: { 
                    type: "string",
                    enum: ["premium", "regular", "budget", "at_risk"]
                  },
                  characteristics: { 
                    type: "string",
                    description: "Detailed RFM characteristics of this segment"
                  },
                  recommendation: { 
                    type: "string",
                    description: "Specific actionable recommendations for this segment"
                  }
                },
                required: ["segment", "characteristics", "recommendation"]
              }
            },
            overall_strategy: { 
              type: "string",
              description: "Comprehensive strategy across all segments"
            }
          },
          required: ["segment_insights", "overall_strategy"]
        }
      });

      setInsights(result);
    } catch (error) {
      console.error("❌ Error analyzing segments:", error);
      setInsights({
        segment_insights: [{
          segment: "error",
          characteristics: error.message || "Analysis failed",
          recommendation: "Please check data format and try again"
        }],
        overall_strategy: "Analysis failed - review data quality"
      });
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
  if (customers.length === 0) {
    return (
      <div className="p-6 md:p-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Customer Segmentation
          </h1>
          <p className="text-slate-600">AI-powered customer clustering and insights</p>
        </div>

        <div className="text-center p-12 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-dashed border-purple-200">
          <Users className="w-16 h-16 mx-auto text-purple-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Customer Data</h3>
          <p className="text-slate-600 mb-4">Upload customer data to start analyzing segments</p>
          <Link to="/data-import">
            <button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all">
              <Upload className="w-4 h-4 inline mr-2" />
              Import Customers
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Customer Segmentation
          </h1>
          <p className="text-slate-600">AI-powered customer clustering and insights</p>
        </div>
        <Button 
          onClick={analyzeSegments}
          disabled={isAnalyzing}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Analyze Segments
            </>
          )}
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Segment Distribution */}
        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Segment Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={segmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {segmentData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Segment Statistics */}
        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Segment Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {segmentData.map((segment, index) => {
                const segmentCustomers = customers.filter(c => 
                  (c.segment || 'regular').toLowerCase() === segment.name.toLowerCase()
                );
                const avgSpent = segmentCustomers.length > 0 
                  ? segmentCustomers.reduce((sum, c) => sum + (parseFloat(c.total_spent) || 0), 0) / segmentCustomers.length 
                  : 0;
                
                return (
                  <div key={index} className="p-4 rounded-xl bg-gradient-to-r from-slate-50 to-transparent">
                    <div className="flex justify-between items-center mb-2">
                      <Badge style={{ backgroundColor: segment.color }} className="text-white">
                        {segment.name}
                      </Badge>
                      <span className="text-sm font-medium text-slate-600">{segment.value} customers</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-slate-500">Avg Spent</p>
                        <p className="text-lg font-bold text-slate-900">${avgSpent.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Percentage</p>
                        <p className="text-lg font-bold text-slate-900">
                          {((segment.value / customers.length) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {insights && (
        <Card className="border-0 shadow-lg shadow-purple-200/50 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI-Powered Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {insights.segment_insights?.map((insight, index) => (
              <div key={index} className="p-5 bg-white rounded-xl shadow-sm">
                <h3 className="font-bold text-lg mb-2 capitalize flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: SEGMENT_COLORS[insight.segment] || '#6366f1' }}
                  />
                  {insight.segment} Segment
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-1">Characteristics:</p>
                    <p className="text-sm text-slate-600">{insight.characteristics}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-1">Recommendation:</p>
                    <p className="text-sm text-slate-600">{insight.recommendation}</p>
                  </div>
                </div>
              </div>
            ))}
            {insights.overall_strategy && (
              <div className="p-5 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl">
                <p className="text-sm font-semibold text-purple-900 mb-2">Overall Strategy:</p>
                <p className="text-sm text-purple-800">{insights.overall_strategy}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Customer List */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardHeader>
          <CardTitle>All Customers ({customers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {customers.slice(0, 10).map((customer, idx) => (
              <div key={customer.id || idx} className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                    {customer.customer_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{customer.customer_name}</p>
                    <p className="text-sm text-slate-500">{customer.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge style={{ backgroundColor: SEGMENT_COLORS[customer.segment || 'regular'] }} className="text-white capitalize">
                    {customer.segment || 'Regular'}
                  </Badge>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">${parseFloat(customer.total_spent || 0).toFixed(0)}</p>
                    <p className="text-xs text-slate-500">{customer.total_purchases || 0} orders</p>
                  </div>
                  {(customer.churn_risk_score || 0) > 60 && (
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}