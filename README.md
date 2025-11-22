📊 RetailIQ – Intelligent Retail Analytics Platform
Data Warehousing & Mining using Machine Learning

RetailIQ is a full-stack analytical platform designed for retailers to turn raw transactional data into actionable insights using Data Warehousing, Data Mining, and Machine Learning.
It provides real-time analytics, customer segmentation, sales forecasting, anomaly detection, recommendation systems, and market basket analysis through a clean and interactive UI.

🚀 Features

✔ Data Import & ETL Pipeline
CSV/Excel upload
Schema detection
Data cleaning (duplicates, missing values, normalization)
Transaction aggregation (flattened → grouped)

✔ Customer Segmentation (K-Means | RFM Model)

Premium, Regular, Budget, At-Risk clusters
Segment insights & retention strategies

✔ Market Basket Analysis (Apriori + FP-Growth)

Frequent itemsets
Support, confidence, lift
AI-generated bundles & cross-sell strategy

✔ Sales Forecasting (Linear Regression)

3-month demand forecasting
R² accuracy
Reorder recommendations

✔ Fraud & Anomaly Detection (Isolation Forest)

High-severity transaction flags
Risk scoring
Pattern analysis
✔ Product Recommendation Engine

Personalized recommendations
Confidence scoring
Segment-based offers

🏗️ System Architecture
Frontend (React.js)
      │
      ▼
Backend API (FastAPI + ML Models)
      │
      ▼
Data Layer (Star Schema / LocalStorage)


⚙️ Installation & Setup
Frontend
cd frontend
npm install
npm start

Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

📊 Key Business Insights Generated

Premium customers are 15% of users but 65% of revenue

Top rule: {Smartwatch} → {Gaming Chair} with 5.45x lift

Reorder recommendations prevent under-stock/over-stock

Fraud detection catches high-risk transactions early
Multi-store analytics dashboard
