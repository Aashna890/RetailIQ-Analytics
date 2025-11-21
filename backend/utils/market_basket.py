from mlxtend.frequent_patterns import apriori, association_rules, fpgrowth
from mlxtend.preprocessing import TransactionEncoder
import pandas as pd

def run_apriori(transactions, min_support=0.03):
    """Run Apriori algorithm"""
    te = TransactionEncoder()
    te_ary = te.fit(transactions).transform(transactions)
    df = pd.DataFrame(te_ary, columns=te.columns_)
    
    frequent_itemsets = apriori(df, min_support=min_support, use_colnames=True)
    return frequent_itemsets

def generate_association_rules(frequent_itemsets, min_confidence=0.2):
    """Generate association rules from frequent itemsets"""
    if len(frequent_itemsets) == 0:
        return pd.DataFrame()
    
    rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=min_confidence)
    return rules

def format_rules_for_frontend(rules):
    """Format rules for frontend consumption"""
    formatted = []
    for _, row in rules.iterrows():
        formatted.append({
            "antecedent": list(row['antecedents']),
            "consequent": list(row['consequents']),
            "support": float(row['support']),
            "confidence": float(row['confidence']),
            "lift": float(row['lift'])
        })
    return formatted