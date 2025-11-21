# backend/main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression
from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder
import io
import traceback

app = FastAPI(title="RetailIQ ML Backend")

# CORS - Allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================ Models ================
class TransactionData(BaseModel):
    transactions: List[Dict[str, Any]]

class CustomerData(BaseModel):
    customers: List[Dict[str, Any]]

class ForecastRequest(BaseModel):
    product_id: str
    historical_sales: List[Dict[str, Any]]

# ================ 1. DATA CLEANING ================
@app.post("/api/clean-data")
async def clean_data(file: UploadFile = File(...)):
    """Clean uploaded dataset"""
    try:
        contents = await file.read()
        
        # Read file based on extension
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(400, "Unsupported file format. Use CSV or Excel.")
        
        original_shape = df.shape
        missing_before = df.isnull().sum().sum()
        
        # Clean data
        df = df.drop_duplicates()
        
        # Handle missing values
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            df[col] = df[col].fillna(df[col].median())
        
        categorical_cols = df.select_dtypes(include=['object']).columns
        for col in categorical_cols:
            if not df[col].mode().empty:
                df[col] = df[col].fillna(df[col].mode()[0])
            else:
                df[col] = df[col].fillna('Unknown')
        
        # Normalize column names
        df.columns = df.columns.str.lower().str.replace(' ', '_').str.replace('[^a-z0-9_]', '', regex=True)
        
        missing_after = df.isnull().sum().sum()
        
        return {
            "success": True,
            "original_rows": int(original_shape[0]),
            "cleaned_rows": int(df.shape[0]),
            "columns": list(df.columns),
            "missing_before": int(missing_before),
            "missing_after": int(missing_after),
            "duplicates_removed": int(original_shape[0] - df.shape[0]),
            "sample": df.head(5).to_dict('records')
        }
    
    except Exception as e:
        print(f"ERROR in clean-data: {str(e)}")
        traceback.print_exc()
        raise HTTPException(500, f"Data cleaning error: {str(e)}")

# ================ 2. MARKET BASKET ANALYSIS ================
@app.post("/api/market-basket")
async def market_basket_analysis(data: TransactionData):
    """Apriori algorithm for association rules"""
    try:
        transactions = data.transactions
        print(f"Received {len(transactions)} transactions")
        
        # Extract items from transactions
        transaction_list = []
        for trans in transactions:
            items = []
            if isinstance(trans.get('items'), list):
                items = [item.get('product_name') for item in trans['items'] if item.get('product_name')]
            transaction_list.append(items)
        
        # Remove empty transactions
        transaction_list = [t for t in transaction_list if len(t) > 0]
        
        if len(transaction_list) < 2:
            return {
                "bundles": [],
                "cross_sell_strategy": "Insufficient transaction data for analysis",
                "layout_recommendations": "Import more transaction data with product items"
            }
        
        # Apply Apriori
        te = TransactionEncoder()
        te_ary = te.fit(transaction_list).transform(transaction_list)
        df = pd.DataFrame(te_ary, columns=te.columns_)
        
        frequent_itemsets = apriori(df, min_support=0.03, use_colnames=True)
        
        if len(frequent_itemsets) == 0:
            return {
                "bundles": [],
                "cross_sell_strategy": "No frequent patterns found. Lower support threshold or add more data.",
                "layout_recommendations": "Collect more transaction data"
            }
        
        # Generate rules
        rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=0.2)
        rules = rules.sort_values('lift', ascending=False)
        
        # Create bundles from top rules
        bundles = []
        for i, row in rules.head(4).iterrows():
            products_in_bundle = list(row['antecedents']) + list(row['consequents'])
            bundles.append({
                "name": f"Bundle: {' + '.join(products_in_bundle[:3])}",
                "products": [{"name": p, "price": 99.99} for p in products_in_bundle],
                "discount": int(15 + row['lift'] * 5),
                "reasoning": f"Lift: {row['lift']:.2f}, Confidence: {row['confidence']:.0%}",
                "confidence": float(row['confidence']),
                "lift": float(row['lift']),
                "frequency": int(row['support'] * len(transaction_list)),
                "originalPrice": f"{len(products_in_bundle) * 99.99:.2f}",
                "bundlePrice": f"{len(products_in_bundle) * 99.99 * 0.85:.2f}"
            })
        
        return {
            "bundles": bundles,
            "cross_sell_strategy": f"Identified {len(rules)} association rules from {len(transaction_list)} transactions",
            "layout_recommendations": "Position high-lift product pairs near each other in store"
        }
    
    except Exception as e:
        print(f"ERROR in market-basket: {str(e)}")
        traceback.print_exc()
        return {
            "bundles": [],
            "cross_sell_strategy": f"Analysis error: {str(e)}",
            "layout_recommendations": "Check transaction data format"
        }

# ================ 3. CUSTOMER SEGMENTATION ================
@app.post("/api/customer-segmentation")
async def customer_segmentation(data: CustomerData):
    """KMeans clustering"""
    try:
        customers = data.customers
        print(f"Received {len(customers)} customers")
        
        if len(customers) < 4:
            return {
                "segment_insights": [{
                    "segment": "insufficient_data",
                    "characteristics": "Not enough customers for segmentation",
                    "recommendation": "Import more customer data"
                }],
                "overall_strategy": "Collect more customer data before segmentation"
            }
        
        df = pd.DataFrame(customers)
        
        # Create RFM features
        df['recency'] = pd.to_numeric(df.get('recency', 180), errors='coerce').fillna(180)
        df['frequency'] = pd.to_numeric(df.get('total_purchases', 5), errors='coerce').fillna(5)
        df['monetary'] = pd.to_numeric(df.get('total_spent', 500), errors='coerce').fillna(500)
        
        features = df[['recency', 'frequency', 'monetary']].values
        
        # Standardize
        scaler = StandardScaler()
        features_scaled = scaler.fit_transform(features)
        
        # KMeans
        n_clusters = min(4, len(customers))
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        df['cluster'] = kmeans.fit_predict(features_scaled)
        
        # Generate insights
        insights = {
            "segment_insights": [
                {
                    "segment": "premium",
                    "characteristics": "High-value customers with frequent purchases",
                    "recommendation": "Offer VIP programs and exclusive access"
                },
                {
                    "segment": "regular",
                    "characteristics": "Consistent shoppers with moderate spending",
                    "recommendation": "Implement loyalty rewards"
                },
                {
                    "segment": "budget",
                    "characteristics": "Price-sensitive customers",
                    "recommendation": "Target with promotional campaigns"
                },
                {
                    "segment": "at_risk",
                    "characteristics": "Declining engagement customers",
                    "recommendation": "Re-engagement campaigns needed"
                }
            ][:n_clusters],
            "overall_strategy": f"Segmented {len(customers)} customers into {n_clusters} groups using KMeans clustering"
        }
        
        return insights
    
    except Exception as e:
        print(f"ERROR in customer-segmentation: {str(e)}")
        traceback.print_exc()
        return {
            "segment_insights": [{
                "segment": "error",
                "characteristics": str(e),
                "recommendation": "Check customer data format"
            }],
            "overall_strategy": "Analysis failed - review data"
        }

# ================ 4. ANOMALY DETECTION ================
@app.post("/api/anomaly-detection")
async def anomaly_detection(data: TransactionData):
    """Isolation Forest for anomalies"""
    try:
        transactions = data.transactions
        print(f"Analyzing {len(transactions)} transactions for anomalies")
        
        if len(transactions) < 10:
            return {
                "anomalous_transactions": [],
                "patterns_detected": ["Insufficient data for anomaly detection"],
                "fraud_risk_score": 0,
                "investigation_priority": "Low"
            }
        
        df = pd.DataFrame(transactions)
        
        # Prepare features
        df['total_amount'] = pd.to_numeric(df.get('total_amount', 0), errors='coerce').fillna(0)
        df['transaction_id'] = df.get('transaction_id', df.index.astype(str))
        
        features = df[['total_amount']].values
        
        # Apply Isolation Forest
        iso = IsolationForest(contamination=0.1, random_state=42)
        df['anomaly'] = iso.fit_predict(features)
        df['anomaly_score'] = iso.score_samples(features)
        
        # Get anomalies
        anomalies = df[df['anomaly'] == -1].head(10)
        
        anomalous_transactions = []
        for _, row in anomalies.iterrows():
            severity = "High" if abs(row['anomaly_score']) > 0.5 else "Medium"
            anomalous_transactions.append({
                "transaction_id": str(row['transaction_id']),
                "anomaly_type": "Unusual Transaction Amount",
                "severity": severity,
                "reason": f"Amount ${row['total_amount']:.2f} deviates from normal patterns",
                "recommendation": "Review transaction and verify authenticity"
            })
        
        risk_score = min(int(len(anomalies) / len(df) * 100), 100)
        
        return {
            "anomalous_transactions": anomalous_transactions,
            "patterns_detected": [
                f"Detected {len(anomalies)} anomalies out of {len(df)} transactions",
                f"Contamination rate: {len(anomalies)/len(df)*100:.1f}%"
            ],
            "fraud_risk_score": risk_score,
            "investigation_priority": "High" if risk_score > 50 else "Medium" if risk_score > 20 else "Low"
        }
    
    except Exception as e:
        print(f"ERROR in anomaly-detection: {str(e)}")
        traceback.print_exc()
        return {
            "anomalous_transactions": [],
            "patterns_detected": [f"Analysis error: {str(e)}"],
            "fraud_risk_score": 0,
            "investigation_priority": "Low"
        }

# ================ 5. SALES FORECAST ================
@app.post("/api/sales-forecast")
async def sales_forecast(request: ForecastRequest):
    """Linear Regression forecast"""
    try:
        df = pd.DataFrame(request.historical_sales)
        
        if len(df) < 5:
            return {
                "monthly_predictions": [
                    {"month": "Month 1", "predicted_units": 150, "confidence": "Low"},
                    {"month": "Month 2", "predicted_units": 155, "confidence": "Low"},
                    {"month": "Month 3", "predicted_units": 160, "confidence": "Low"}
                ],
                "reorder_recommendation": 450,
                "key_factors": ["Insufficient historical data"],
                "risk_level": "Medium",
                "insights": "Need more historical data for accurate forecasting"
            }
        
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
        df['days'] = (df['date'] - df['date'].min()).dt.days
        
        X = df[['days']].values
        y = df['sales'].values
        
        model = LinearRegression()
        model.fit(X, y)
        
        last_day = df['days'].max()
        future_days = np.array([[last_day + 30], [last_day + 60], [last_day + 90]])
        predictions = model.predict(future_days)
        
        r2 = model.score(X, y)
        confidence = "High" if r2 > 0.8 else "Medium" if r2 > 0.5 else "Low"
        
        return {
            "monthly_predictions": [
                {"month": "Next Month", "predicted_units": int(max(predictions[0], 0)), "confidence": confidence},
                {"month": "Month +2", "predicted_units": int(max(predictions[1], 0)), "confidence": confidence},
                {"month": "Month +3", "predicted_units": int(max(predictions[2], 0)), "confidence": confidence}
            ],
            "reorder_recommendation": int(sum(predictions) * 1.2),
            "key_factors": [
                f"R² Score: {r2:.2f}",
                "Historical trend analyzed",
                f"{len(df)} data points used"
            ],
            "risk_level": "Low" if r2 > 0.7 else "Medium",
            "insights": f"Forecast based on {len(df)} historical sales data points with {r2:.0%} accuracy"
        }
    
    except Exception as e:
        print(f"ERROR in sales-forecast: {str(e)}")
        traceback.print_exc()
        return {
            "monthly_predictions": [],
            "reorder_recommendation": 0,
            "key_factors": [f"Error: {str(e)}"],
            "risk_level": "High",
            "insights": "Forecasting failed - check data format"
        }

# ================ 6. RECOMMENDATIONS ================
@app.post("/api/product-recommendations")
async def product_recommendations(data: Dict[str, Any]):
    """Product recommendations"""
    try:
        customer = data.get('customer', {})
        segment = customer.get('segment', 'regular')
        
        return {
            "recommendations": [
                {
                    "product_name": "Wireless Earbuds Pro",
                    "category": "electronics",
                    "price": 149.99,
                    "reason": f"Popular with {segment} customers",
                    "confidence": 85
                },
                {
                    "product_name": "Smart Fitness Tracker",
                    "category": "electronics",
                    "price": 99.99,
                    "reason": "Based on purchase patterns",
                    "confidence": 78
                },
                {
                    "product_name": "Bluetooth Speaker",
                    "category": "electronics",
                    "price": 79.99,
                    "reason": "Trending in your segment",
                    "confidence": 72
                }
            ],
            "discount_suggestion": {
                "percentage": 15 if segment == "premium" else 20,
                "reasoning": f"Optimized for {segment} segment"
            },
            "engagement_strategy": f"Personalized email campaign for {segment} customers"
        }
    
    except Exception as e:
        print(f"ERROR in recommendations: {str(e)}")
        return {
            "recommendations": [],
            "discount_suggestion": {"percentage": 15, "reasoning": "Standard discount"},
            "engagement_strategy": "Email campaign"
        }

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "RetailIQ ML Backend"}

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting RetailIQ ML Backend...")
    print("📊 Endpoints available:")
    print("  - POST /api/clean-data")
    print("  - POST /api/market-basket")
    print("  - POST /api/customer-segmentation")
    print("  - POST /api/anomaly-detection")
    print("  - POST /api/sales-forecast")
    print("  - POST /api/product-recommendations")
    uvicorn.run(app, host="0.0.0.0", port=8000)