"""
Feature Preprocessing Pipeline
Handles feature engineering and scaling for the fraud detection model
"""

import numpy as np
from sklearn.preprocessing import StandardScaler
import joblib
import os

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'model')
SCALER_PATH = os.path.join(MODEL_DIR, 'scaler.pkl')

# Feature names expected by the model
FEATURE_NAMES = ['amount', 'frequency', 'location_change', 'device_change', 'hour_of_day']


def preprocess_input(data: dict) -> np.ndarray:
    """
    Preprocess a single transaction input for prediction

    Args:
        data: dict with keys: amount, frequency, location_change, device_change

    Returns:
        numpy array of shape (1, n_features) ready for model prediction
    """
    # Extract and engineer features
    amount = float(data.get('amount', 0))
    frequency = int(data.get('frequency', 0))
    location_change = int(data.get('location_change', 0))
    device_change = int(data.get('device_change', 0))

    # Derive hour_of_day from current time if not provided
    from datetime import datetime
    hour_of_day = data.get('hour_of_day') or datetime.now().hour

    features = np.array([[amount, frequency, location_change, device_change, hour_of_day]])

    # Apply scaler if available
    if os.path.exists(SCALER_PATH):
        scaler = joblib.load(SCALER_PATH)
        features = scaler.transform(features)

    return features


def preprocess_training_data(df):
    """
    Preprocess training dataframe

    Args:
        df: pandas DataFrame with feature columns and 'is_fraud' label

    Returns:
        X_scaled: scaled feature matrix
        y: label array
        scaler: fitted StandardScaler
    """
    feature_cols = [col for col in FEATURE_NAMES if col in df.columns]

    X = df[feature_cols].values
    y = df['is_fraud'].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Save scaler
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(scaler, SCALER_PATH)

    return X_scaled, y, scaler


def generate_reason(data: dict, fraud_score: float) -> str:
    """
    Generate human-readable explanation for the fraud score

    Args:
        data: input transaction data
        fraud_score: predicted fraud probability

    Returns:
        Explainability string
    """
    reasons = []

    amount = float(data.get('amount', 0))
    frequency = int(data.get('frequency', 0))
    location_change = int(data.get('location_change', 0))
    device_change = int(data.get('device_change', 0))

    if amount > 10000:
        reasons.append(f"High amount (${amount:,.2f})")
    if amount > 50000:
        reasons.append("Extremely high amount")

    if frequency > 10:
        reasons.append(f"High transaction frequency ({frequency} in 5min)")
    elif frequency > 5:
        reasons.append(f"Elevated transaction frequency ({frequency} in 5min)")

    if location_change:
        reasons.append("Location change detected")

    if device_change:
        reasons.append("Device change detected")

    if location_change and device_change:
        reasons.append("[WARNING] Both location and device changed simultaneously")

    from datetime import datetime
    hour = data.get('hour_of_day') or datetime.now().hour
    if 0 <= hour <= 5:
        reasons.append("Transaction at unusual hour")

    if not reasons:
        if fraud_score > 0.5:
            reasons.append("Statistical anomaly detected by ML model")
        else:
            reasons.append("No significant risk factors")

    return " | ".join(reasons)
