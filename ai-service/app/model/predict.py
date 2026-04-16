"""
Prediction Module
Loads trained models and provides fraud score predictions with explainability
"""

import os
import numpy as np
import joblib

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from utils.preprocessing import preprocess_input, generate_reason

MODEL_DIR = os.path.dirname(__file__)
ISOLATION_MODEL_PATH = os.path.join(MODEL_DIR, 'isolation_forest.pkl')
CLASSIFIER_MODEL_PATH = os.path.join(MODEL_DIR, 'model.pkl')

# Cached models (loaded once)
_isolation_forest = None
_classifier = None


def _load_models():
    """Load models into memory (lazy loading with caching)"""
    global _isolation_forest, _classifier

    if _classifier is None and os.path.exists(CLASSIFIER_MODEL_PATH):
        _classifier = joblib.load(CLASSIFIER_MODEL_PATH)
        print(f"✅ Classifier loaded from {CLASSIFIER_MODEL_PATH}")

    if _isolation_forest is None and os.path.exists(ISOLATION_MODEL_PATH):
        _isolation_forest = joblib.load(ISOLATION_MODEL_PATH)
        print(f"✅ Isolation Forest loaded from {ISOLATION_MODEL_PATH}")


def predict(data: dict) -> dict:
    """
    Predict fraud score for a transaction

    Args:
        data: dict with keys: amount, frequency, location_change, device_change

    Returns:
        dict: {
            fraud_score: float (0-1),
            risk_level: str (low/medium/high),
            reason: str,
            model_scores: { classifier: float, isolation_forest: float }
        }
    """
    _load_models()

    # Preprocess input
    features = preprocess_input(data)

    scores = {}

    # ──────────────── Classifier Score ────────────────
    classifier_score = 0.0
    if _classifier is not None:
        try:
            proba = _classifier.predict_proba(features)[0]
            classifier_score = float(proba[1])  # Probability of fraud class
            scores['classifier'] = round(classifier_score, 4)
        except Exception as e:
            print(f"⚠️ Classifier prediction failed: {e}")
            scores['classifier'] = 0.0

    # ──────────────── Isolation Forest Score ────────────────
    isolation_score = 0.0
    if _isolation_forest is not None:
        try:
            # decision_function returns negative for anomalies
            raw_score = _isolation_forest.decision_function(features)[0]
            # Convert to 0-1 probability (more negative = more anomalous)
            isolation_score = float(max(0, min(1, 0.5 - raw_score)))
            scores['isolation_forest'] = round(isolation_score, 4)
        except Exception as e:
            print(f"⚠️ Isolation Forest prediction failed: {e}")
            scores['isolation_forest'] = 0.0

    # ──────────────── Ensemble Score ────────────────
    if _classifier is not None and _isolation_forest is not None:
        # Weighted ensemble: classifier gets more weight (trained on labels)
        fraud_score = 0.6 * classifier_score + 0.4 * isolation_score
    elif _classifier is not None:
        fraud_score = classifier_score
    elif _isolation_forest is not None:
        fraud_score = isolation_score
    else:
        # No models available — use rule-based fallback
        fraud_score = _rule_based_score(data)
        scores['fallback'] = round(fraud_score, 4)

    fraud_score = round(float(fraud_score), 4)

    # Risk level
    if fraud_score >= 0.7:
        risk_level = 'high'
    elif fraud_score >= 0.3:
        risk_level = 'medium'
    else:
        risk_level = 'low'

    # Explainability
    reason = generate_reason(data, fraud_score)

    return {
        'fraud_score': fraud_score,
        'risk_level': risk_level,
        'reason': reason,
        'model_scores': scores,
    }


def _rule_based_score(data: dict) -> float:
    """Fallback rule-based scoring when no models are available"""
    score = 0.0
    amount = float(data.get('amount', 0))
    frequency = int(data.get('frequency', 0))
    location_change = int(data.get('location_change', 0))
    device_change = int(data.get('device_change', 0))

    if amount > 50000:
        score += 0.4
    elif amount > 10000:
        score += 0.2

    if frequency > 10:
        score += 0.3
    elif frequency > 5:
        score += 0.15

    if location_change:
        score += 0.15

    if device_change:
        score += 0.15

    return min(score, 1.0)


def reload_models():
    """Force reload models (e.g., after retraining)"""
    global _isolation_forest, _classifier
    _isolation_forest = None
    _classifier = None
    _load_models()
    return True
