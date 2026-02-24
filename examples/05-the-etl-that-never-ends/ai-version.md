import pandas as pd
import os

def process_sales_data():
    """Process sales data from CSV file."""
    # Read the entire file into memory
    df = pd.read_csv('sales_2024.csv')

    # Clean data
    df = df.dropna()
    df['total'] = df['quantity'] * df['price']

    # Aggregate by category
    results = df.groupby('category').agg({
        'total': 'sum',
        'quantity': 'count'
    }).reset_index()

    # Save results
    results.to_csv('sales_summary.csv', index=False)
    print(f"Processed {len(df)} records")

if __name__ == "__main__":
    process_sales_data()
