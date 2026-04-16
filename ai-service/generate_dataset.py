"""
Synthetic Transaction Dataset Generator
Generates realistic transaction data with ~5% fraud rate for model training
"""

import pandas as pd
import numpy as np
import os

def generate_dataset(n_samples=10000, fraud_ratio=0.05, output_path=None):
    """Generate synthetic transaction dataset"""

    np.random.seed(42)

    n_fraud = int(n_samples * fraud_ratio)
    n_normal = n_samples - n_fraud

    # ──────────────── Normal Transactions ────────────────
    normal_data = {
        'amount': np.random.lognormal(mean=4, sigma=1, size=n_normal).clip(1, 5000),
        'frequency': np.random.poisson(lam=3, size=n_normal).clip(0, 15),
        'location_change': np.random.binomial(1, 0.1, size=n_normal),  # 10% change location
        'device_change': np.random.binomial(1, 0.05, size=n_normal),   # 5% change device
        'hour_of_day': np.random.choice(range(8, 23), size=n_normal),  # Business hours mostly
        'is_fraud': np.zeros(n_normal, dtype=int),
    }

    # ──────────────── Fraudulent Transactions ────────────────
    fraud_data = {
        'amount': np.random.lognormal(mean=8, sigma=1.5, size=n_fraud).clip(5000, 100000),
        'frequency': np.random.poisson(lam=15, size=n_fraud).clip(8, 50),
        'location_change': np.random.binomial(1, 0.7, size=n_fraud),   # 70% change location
        'device_change': np.random.binomial(1, 0.6, size=n_fraud),     # 60% change device
        'hour_of_day': np.random.choice(range(0, 6), size=n_fraud),    # Unusual hours
        'is_fraud': np.ones(n_fraud, dtype=int),
    }

    # Combine and shuffle
    normal_df = pd.DataFrame(normal_data)
    fraud_df = pd.DataFrame(fraud_data)
    df = pd.concat([normal_df, fraud_df], ignore_index=True)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)

    # Round amounts
    df['amount'] = df['amount'].round(2)

    if output_path is None:
        output_path = os.path.join(os.path.dirname(__file__), 'app', 'model', 'dataset.csv')

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)

    print(f"✅ Dataset generated: {len(df)} samples ({n_fraud} fraud, {n_normal} normal)")
    print(f"📁 Saved to: {output_path}")
    print(f"\nFeature distributions:")
    print(df.describe().round(2))
    print(f"\nFraud rate: {(df['is_fraud'].mean() * 100):.1f}%")

    return df


if __name__ == '__main__':
    generate_dataset()
