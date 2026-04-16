"""
Model Training Pipeline
Trains an Isolation Forest (anomaly detection) + Random Forest (classifier) ensemble
"""

import os
import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from utils.preprocessing import preprocess_training_data

MODEL_DIR = os.path.dirname(__file__)
ISOLATION_MODEL_PATH = os.path.join(MODEL_DIR, 'isolation_forest.pkl')
CLASSIFIER_MODEL_PATH = os.path.join(MODEL_DIR, 'model.pkl')
DATASET_PATH = os.path.join(MODEL_DIR, 'dataset.csv')


def train_models(dataset_path=None):
    """
    Train both anomaly detection and classification models

    Returns:
        dict with training metrics
    """
    if dataset_path is None:
        dataset_path = DATASET_PATH

    if not os.path.exists(dataset_path):
        print("⚠️ No dataset found. Generating synthetic data...")
        # Import and run the dataset generator
        gen_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'generate_dataset.py')
        if os.path.exists(gen_path):
            import importlib.util
            spec = importlib.util.spec_from_file_location("generate_dataset", gen_path)
            gen_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(gen_module)
            gen_module.generate_dataset(output_path=dataset_path)
        else:
            raise FileNotFoundError(f"Dataset not found at {dataset_path} and generator not available")

    print(f"📂 Loading dataset from: {dataset_path}")
    df = pd.read_csv(dataset_path)
    print(f"   Loaded {len(df)} samples")

    # Preprocess
    X_scaled, y, scaler = preprocess_training_data(df)

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )

    # ──────────────── 1. Isolation Forest (Anomaly Detection) ────────────────
    print("\n🌲 Training Isolation Forest...")
    iso_forest = IsolationForest(
        n_estimators=200,
        contamination=0.05,  # Expected fraud ratio
        max_samples='auto',
        random_state=42,
        n_jobs=-1,
    )
    iso_forest.fit(X_train)

    # Save Isolation Forest
    joblib.dump(iso_forest, ISOLATION_MODEL_PATH)
    print(f"   ✅ Isolation Forest saved to: {ISOLATION_MODEL_PATH}")

    # ──────────────── 2. Random Forest Classifier ────────────────
    print("\n🌳 Training Random Forest Classifier...")
    rf_classifier = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        min_samples_split=5,
        class_weight='balanced',  # Handle class imbalance
        random_state=42,
        n_jobs=-1,
    )
    rf_classifier.fit(X_train, y_train)

    # Save classifier
    joblib.dump(rf_classifier, CLASSIFIER_MODEL_PATH)
    print(f"   ✅ Random Forest saved to: {CLASSIFIER_MODEL_PATH}")

    # ──────────────── Evaluation ────────────────
    print("\n📊 Evaluation Results:")

    # Classifier metrics
    y_pred = rf_classifier.predict(X_test)
    y_proba = rf_classifier.predict_proba(X_test)[:, 1]

    print("\nRandom Forest Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['Normal', 'Fraud']))

    auc_score = roc_auc_score(y_test, y_proba)
    print(f"AUC-ROC Score: {auc_score:.4f}")

    # Isolation Forest metrics
    iso_scores = iso_forest.decision_function(X_test)
    iso_pred = (iso_scores < 0).astype(int)  # Negative scores = anomalies
    print("\nIsolation Forest Classification Report:")
    print(classification_report(y_test, iso_pred, target_names=['Normal', 'Fraud']))

    # Feature importance (from Random Forest)
    feature_names = ['amount', 'frequency', 'location_change', 'device_change', 'hour_of_day']
    importances = rf_classifier.feature_importances_
    print("\nFeature Importance:")
    for name, imp in sorted(zip(feature_names, importances), key=lambda x: -x[1]):
        print(f"   {name}: {imp:.4f}")

    metrics = {
        'auc_roc': round(auc_score, 4),
        'samples_total': len(df),
        'samples_train': len(X_train),
        'samples_test': len(X_test),
        'fraud_ratio': round(y.mean(), 4),
        'feature_importance': dict(zip(feature_names, importances.round(4).tolist())),
    }

    print(f"\n✅ Training complete!")
    return metrics


if __name__ == '__main__':
    metrics = train_models()
    print(f"\n📈 Final Metrics: {metrics}")
