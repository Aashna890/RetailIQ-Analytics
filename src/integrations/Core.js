const API_URL = 'http://localhost:8000/api';

let globalTransactions = [];
let globalCustomers = [];
let globalProducts = [];

export async function InvokeLLM({ prompt, response_json_schema }) {
  console.log('InvokeLLM called - routing to real ML backend');
  
  try {
    // ==================== MARKET BASKET ANALYSIS ====================
    if (response_json_schema.properties.bundles) {
      const processedTransactions = globalTransactions.map(t => {
        let items = [];
        
        if (typeof t.items === 'string') {
          try {
            items = JSON.parse(t.items);
          } catch (e) {
            console.warn('Failed to parse items JSON:', e);
            items = [];
          }
        } else if (Array.isArray(t.items)) {
          items = t.items;
        }
        
        return {
          transaction_id: t.transaction_id,
          total_amount: parseFloat(t.total_amount) || 0,
          items: items
        };
      });

      console.log('📊 Sending to backend:', processedTransactions.length, 'transactions');
      
      const response = await fetch(`${API_URL}/market-basket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: processedTransactions
        })
      });
      
      if (!response.ok) {
        console.warn('ML backend unavailable, using fallback');
        return generateFallbackBundles();
      }
      
      const result = await response.json();
      console.log('✅ Backend response:', result);
      
      return {
        bundles: result.bundles || generateFallbackBundles().bundles,
        cross_sell_strategy: result.cross_sell_strategy || "Position complementary products based on association rules",
        layout_recommendations: result.layout_recommendations || "Place high-lift product pairs in proximity"
      };
    }
    
    // ==================== CUSTOMER SEGMENTATION ====================
    if (response_json_schema.properties.segment_insights) {
      const response = await fetch(`${API_URL}/customer-segmentation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customers: globalCustomers
        })
      });
      
      if (!response.ok) {
        console.warn('ML backend unavailable, using fallback');
        return generateFallbackSegmentation();
      }
      
      const result = await response.json();
      return result || generateFallbackSegmentation();
    }
    
    // ==================== ANOMALY DETECTION ====================
    if (response_json_schema.properties.anomalous_transactions) {
      const processedTransactions = globalTransactions.map(t => ({
        transaction_id: t.transaction_id,
        total_amount: parseFloat(t.total_amount) || 0
      }));

      const response = await fetch(`${API_URL}/anomaly-detection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: processedTransactions
        })
      });
      
      if (!response.ok) {
        console.warn('ML backend unavailable, using fallback');
        return generateFallbackAnomalies();
      }
      
      return await response.json();
    }
    
    // ==================== PRODUCT RECOMMENDATIONS ====================
    if (response_json_schema.properties.recommendations) {
      const response = await fetch(`${API_URL}/product-recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: window._retailiq_selected_customer || {},
          products: globalProducts
        })
      });
      
      if (!response.ok) {
        console.warn('ML backend unavailable, using fallback');
        return generateFallbackRecommendations();
      }
      
      return await response.json();
    }
    
    // ==================== SALES FORECASTING ====================
    if (response_json_schema.properties.monthly_predictions) {
      const response = await fetch(`${API_URL}/sales-forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: window._retailiq_selected_product_id || 'default',
          historical_sales: generateHistoricalSales()
        })
      });
      
      if (!response.ok) {
        console.warn('ML backend unavailable, using fallback');
        return generateFallbackForecast();
      }
      
      return await response.json();
    }
    
    return generateFallbackResponse(response_json_schema);
    
  } catch (error) {
    console.error('ML Backend Error:', error);
    return generateFallbackResponse(response_json_schema);
  }
}

// Helper: Store transactions globally
export function setGlobalTransactions(transactions) {
  globalTransactions = transactions;
  console.log('✅ Stored', transactions.length, 'transactions globally');
}

export function setGlobalCustomers(customers) {
  globalCustomers = customers;
  console.log('✅ Stored', customers.length, 'customers globally');
}

export function setGlobalProducts(products) {
  globalProducts = products;
  console.log('✅ Stored', products.length, 'products globally');
}

function generateHistoricalSales() {
  const data = [];
  const baseDate = new Date();
  baseDate.setMonth(baseDate.getMonth() - 6);
  
  for (let i = 0; i < 180; i += 7) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    data.push({
      date: date.toISOString(),
      sales: Math.floor(Math.random() * 50) + 100 + i * 0.5
    });
  }
  
  return data;
}

// Fallback functions
function generateFallbackBundles() {
  return {
    bundles: [
      {
        name: "Tech Essentials Bundle",
        products: [
          { name: "Laptop", price: 99.99 },
          { name: "Mouse", price: 29.99 }
        ],
        discount: 15,
        reasoning: "Frequently purchased together",
        confidence: 0.75,
        lift: 2.3,
        frequency: 45,
        originalPrice: "129.98",
        bundlePrice: "110.48"
      }
    ],
    cross_sell_strategy: "Position related products together",
    layout_recommendations: "Place complementary items in proximity"
  };
}

function generateFallbackSegmentation() {
  return {
    segment_insights: [
      {
        segment: "premium",
        characteristics: "High-value customers with frequent purchases",
        recommendation: "Offer VIP loyalty programs"
      },
      {
        segment: "regular",
        characteristics: "Consistent shoppers with moderate spending",
        recommendation: "Implement targeted promotions"
      }
    ],
    overall_strategy: "Focus on retaining premium customers"
  };
}

function generateFallbackAnomalies() {
  return {
    anomalous_transactions: [],
    patterns_detected: [],
    fraud_risk_score: 0,
    investigation_priority: "Low"
  };
}

function generateFallbackRecommendations() {
  return {
    recommendations: [
      {
        product_name: "Recommended Product",
        category: "electronics",
        price: 99.99,
        reason: "Based on your preferences",
        confidence: 75
      }
    ],
    discount_suggestion: {
      percentage: 15,
      reasoning: "Standard discount for this segment"
    },
    engagement_strategy: "Send personalized email"
  };
}

function generateFallbackForecast() {
  return {
    monthly_predictions: [
      { month: "Month 1", predicted_units: 145, confidence: "Medium" },
      { month: "Month 2", predicted_units: 162, confidence: "Medium" },
      { month: "Month 3", predicted_units: 138, confidence: "Low" }
    ],
    reorder_recommendation: 450,
    key_factors: ["Historical trend", "Seasonal patterns"],
    risk_level: "Low",
    insights: "Stable demand expected"
  };
}

function generateFallbackResponse(schema) {
  if (schema.properties.bundles) return generateFallbackBundles();
  if (schema.properties.segment_insights) return generateFallbackSegmentation();
  if (schema.properties.anomalous_transactions) return generateFallbackAnomalies();
  if (schema.properties.recommendations) return generateFallbackRecommendations();
  if (schema.properties.monthly_predictions) return generateFallbackForecast();
  return { message: "Fallback response" };
}

// ==================== FILE UPLOAD ====================
export async function UploadFile({ file }) {
  console.log('UploadFile called with:', file.name);
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_URL}/clean-data`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) throw new Error('File upload failed');
    
    const result = await response.json();
    
    return {
      file_url: `processed/${file.name}`,
      file_id: `file_${Date.now()}`,
      success: true,
      cleaning_report: result
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      file_url: `mock/${file.name}`,
      file_id: `file_${Date.now()}`,
      success: false,
      error: error.message
    };
  }
}

// ==================== DATA EXTRACTION ====================
export async function ExtractDataFromUploadedFile({ file_url, json_schema }) {
  console.log('ExtractDataFromUploadedFile called');
  
  // ✅ FIXED: Handle flattened transaction structure
  if (window._uploaded_file_content) {
    const Papa = await import('papaparse');
    const parsed = Papa.parse(window._uploaded_file_content, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false
    });
    
    console.log('✅ Parsed CSV:', parsed.data.length, 'rows');
   
    const firstRow = parsed.data[0];
    const isFlattened = firstRow && firstRow.transaction_id && firstRow.product_name;
    
    if (isFlattened) {
      console.log('🔄 Detected flattened transaction structure - aggregating...');
      
 
      const transactionMap = new Map();
      
      parsed.data.forEach(row => {
        const txnId = row.transaction_id;
        if (!txnId) return;
        
        if (!transactionMap.has(txnId)) {
          transactionMap.set(txnId, {
            transaction_id: txnId,
            customer_name: row.customer_name,
            email: row.email,
            total_amount: parseFloat(row.total_amount) || 0,
            transaction_date: row.transaction_date || new Date().toISOString(),
            payment_method: row.payment_method || 'credit_card',
            status: row.status || 'completed',
            items: []
          });
        }
        
        // Add product to items array
        const txn = transactionMap.get(txnId);
        if (row.product_name) {
          txn.items.push({
            product_name: row.product_name,
            unit_price: parseFloat(row.price) || 0,
            quantity: parseInt(row.total_sold) || 1
          });
        }
      });
      
      // Convert items array to JSON string for storage
      const aggregatedTransactions = Array.from(transactionMap.values()).map(txn => ({
        ...txn,
        items: JSON.stringify(txn.items)
      }));
      
      console.log('✅ Aggregated into', aggregatedTransactions.length, 'unique transactions');
      
      window._uploaded_file_content = null;
      
      return {
        status: "success",
        output: aggregatedTransactions,
        record_count: aggregatedTransactions.length
      };
    }
    
    // Regular CSV processing
    const cleanedData = parsed.data.map(row => {
      const record = { ...row };
      
      // Convert numeric fields
      if (record.total_amount) record.total_amount = parseFloat(record.total_amount) || 0;
      if (record.price) record.price = parseFloat(record.price) || 0;
      if (record.total_spent) record.total_spent = parseFloat(record.total_spent) || 0;
      if (record.total_purchases) record.total_purchases = parseInt(record.total_purchases) || 0;
      
      return record;
    });
    
    window._uploaded_file_content = null;
    
    return {
      status: "success",
      output: cleanedData,
      record_count: cleanedData.length
    };
  }
  
  return {
    status: "success",
    output: [],
    record_count: 0
  };
}
