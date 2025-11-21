from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import StandardScaler
import numpy as np

def perform_kmeans_clustering(features, n_clusters=4):
    """Perform K-Means clustering"""
    scaler = StandardScaler()
    features_scaled = scaler.fit_transform(features)
    
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(features_scaled)
    
    return labels, kmeans

def calculate_rfm_features(customers_df):
    """Calculate RFM features for customer segmentation"""
    # This is a simplified version - implement full RFM logic
    features = {
        'recency': customers_df.get('recency', [0] * len(customers_df)),
        'frequency': customers_df.get('total_purchases', [0] * len(customers_df)),
        'monetary': customers_df.get('total_spent', [0] * len(customers_df))
    }
    return features
