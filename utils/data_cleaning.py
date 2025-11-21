import pandas as pd
import numpy as np

def clean_dataset(df):
    """Clean uploaded dataset"""
    # Remove duplicates
    df = df.drop_duplicates()
    
    # Handle missing values
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())
    
    categorical_cols = df.select_dtypes(include=['object']).columns
    for col in categorical_cols:
        df[col] = df[col].fillna(df[col].mode()[0] if not df[col].mode().empty else 'Unknown')
    
    # Normalize column names
    df.columns = df.columns.str.lower().str.replace(' ', '_')
    
    return df

def generate_cleaning_report(original_df, cleaned_df):
    """Generate data cleaning report"""
    return {
        "original_shape": original_df.shape,
        "cleaned_shape": cleaned_df.shape,
        "duplicates_removed": original_df.shape[0] - cleaned_df.shape[0],
        "missing_values_handled": original_df.isnull().sum().to_dict()
    }