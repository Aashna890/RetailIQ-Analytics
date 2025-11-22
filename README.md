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

🧠 Tech Stack
Frontend

React.js

Recharts

Tailwind CSS

shadcn/ui

Backend

FastAPI

Python

Pandas, NumPy

Scikit-learn

mlxtend

Data Architecture

Star Schema (Fact + Dimensions)

LocalStorage (demo)

Ready for SQL migration

🏗️ System Architecture
Frontend (React.js)
      │
      ▼
Backend API (FastAPI + ML Models)
      │
      ▼
Data Layer (Star Schema / LocalStorage)

📂 Project Structure
RetailIQ/
│── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   └── integrations/Core.js
│
│── backend/
│   ├── main.py
│   ├── clustering.py
│   ├── market_basket.py
│   ├── forecasting.py
│   └── anomalies.py
│
└── datasets/
    └── sample_transactions.csv

⚙️ Installation & Setup
Frontend
cd frontend
npm install
npm start

Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

📈 Machine Learning Performance
Algorithm	Use Case	Time	Score
K-Means	Segmentation	0.8s	Silhouette: 0.65
Apriori	Market Basket	2.3s	156 rules
Isolation Forest	Anomaly Detection	1.2s	10% anomalies
Linear Regression	Forecasting	0.5s	R²: 0.82
📊 Key Business Insights Generated

Premium customers are 15% of users but 65% of revenue

Top rule: {Smartwatch} → {Gaming Chair} with 5.45x lift

Reorder recommendations prevent under-stock/over-stock

Fraud detection catches high-risk transactions early

🎯 Future Enhancements

PostgreSQL/BigQuery integration

Real-time event streaming (Kafka)

ARIMA/Prophet forecasting

Deep-learning recommendation engine

Multi-store analytics dashboard
