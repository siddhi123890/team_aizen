"""
Prediction Module — v2 (Ensemble Voter Integration)
=====================================================
Loads the Ensemble Voter (PaySim XGBoost + CreditCard LightGBM)
and provides fraud score predictions with explainability.

Backward-compatible with the old API contract — the backend still sends
{ amount, frequency, location_change, device_change, hour_of_day }
and gets back { fraud_score, risk_level, reason, model_scores }.
"""

import os
import sys
import numpy as np
import joblib

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from utils.preprocessing import generate_reason

MODEL_DIR = os.path.dirname(__file__)

# ── Model paths ──
PAYSIM_MODEL_PATH = os.path.join(MODEL_DIR, 'paysim_model.pkl')
CREDITCARD_MODEL_PATH = os.path.join(MODEL_DIR, 'creditcard_model.pkl')

# ── Legacy model paths (fallback) ──
LEGACY_ISOLATION_PATH = os.path.join(MODEL_DIR, 'isolation_forest.pkl')
LEGACY_CLASSIFIER_PATH = os.path.join(MODEL_DIR, 'model.pkl')

# ── Ensemble Weights ──
BEHAVIORAL_WEIGHT = 0.60
PATTERN_WEIGHT = 0.40
FRAUD_THRESHOLD = 0.50

# ── Minute Transaction Alert Thresholds ──
MINUTE_TXN_AMOUNT_THRESHOLD = 5.0
MINUTE_TXN_FREQ_THRESHOLD = 8
MINUTE_TXN_OVERRIDE_SCORE = 0.92

# ── Cached models ──
_paysim_model = None
_creditcard_model = None
_legacy_classifier = None
_legacy_isolation = None
_models_loaded = False


def _load_models():
    """Load ensemble models (lazy loading with caching)."""
    global _paysim_model, _creditcard_model
    global _legacy_classifier, _legacy_isolation
    global _models_loaded

    if _models_loaded:
        return

    # ── New Ensemble Models ──
    if os.path.exists(PAYSIM_MODEL_PATH):
        _paysim_model = joblib.load(PAYSIM_MODEL_PATH)
        print(f"  [OK] PaySim XGBoost loaded: {os.path.basename(PAYSIM_MODEL_PATH)}")
    else:
        print(f"  [!!] PaySim model not found: {PAYSIM_MODEL_PATH}")

    if os.path.exists(CREDITCARD_MODEL_PATH):
        _creditcard_model = joblib.load(CREDITCARD_MODEL_PATH)
        print(f"  [OK] CreditCard LightGBM loaded: {os.path.basename(CREDITCARD_MODEL_PATH)}")
    else:
        print(f"  [!!] CreditCard model not found: {CREDITCARD_MODEL_PATH}")

    # ── Legacy Models (fallback) ──
    if _paysim_model is None and os.path.exists(LEGACY_CLASSIFIER_PATH):
        _legacy_classifier = joblib.load(LEGACY_CLASSIFIER_PATH)
        print(f"  [OK] Legacy classifier loaded (fallback)")

    if _paysim_model is None and os.path.exists(LEGACY_ISOLATION_PATH):
        _legacy_isolation = joblib.load(LEGACY_ISOLATION_PATH)
        print(f"  [OK] Legacy isolation forest loaded (fallback)")

    _models_loaded = True


# ══════════════════════════════════════════════
#  FEATURE PREPARATION
# ══════════════════════════════════════════════
def _prepare_behavioral_features(data: dict) -> np.ndarray:
    """
    Prepare features for the PaySim XGBoost model.

    Handles both rich inputs (from direct API calls with balance data)
    and simple inputs (from backend with only amount/frequency).
    """
    # Determine transaction type
    txn_type = data.get("type", "TRANSFER")
    type_enc = 1 if txn_type == "TRANSFER" else 0

    amount = float(data.get("amount", 0))
    step = int(data.get("step", data.get("hour_of_day", 1) or 1))

    # ── Balance fields: use provided values or infer from context ──
    oldbalanceOrg = float(data.get("oldbalanceOrg", amount * 1.2))
    newbalanceOrig = float(data.get("newbalanceOrig", oldbalanceOrg - amount))
    oldbalanceDest = float(data.get("oldbalanceDest", 0))
    newbalanceDest = float(data.get("newbalanceDest", oldbalanceDest + amount))

    # If location/device changed, simulate suspicious balance patterns
    location_change = int(data.get("location_change", 0))
    device_change = int(data.get("device_change", 0))
    frequency = int(data.get("frequency", 0))

    # Adjust balance estimates for suspicious transactions
    if location_change or device_change or frequency > 5:
        # Suspicious pattern: simulate balance drain
        newbalanceOrig = float(data.get("newbalanceOrig", 0))
        newbalanceDest = float(data.get("newbalanceDest", 0))

    # ── Engineered features (same as training) ──
    amount_micro = 1 if amount < 1.0 else 0
    orig_balance_zero = 1 if newbalanceOrig == 0 else 0
    dest_balance_zero = 1 if newbalanceDest == 0 else 0
    balance_delta_orig = oldbalanceOrg - newbalanceOrig
    balance_delta_dest = newbalanceDest - oldbalanceDest
    error_balance_orig = (oldbalanceOrg - amount) - newbalanceOrig
    error_balance_dest = (oldbalanceDest + amount) - newbalanceDest
    amount_ratio_orig = amount / (oldbalanceOrg + 1)

    features = np.array([[
        type_enc, amount, oldbalanceOrg, newbalanceOrig,
        oldbalanceDest, newbalanceDest, step,
        amount_micro, orig_balance_zero, dest_balance_zero,
        balance_delta_orig, balance_delta_dest,
        error_balance_orig, error_balance_dest, amount_ratio_orig,
    ]])

    return features


def _prepare_pattern_features(data: dict) -> np.ndarray:
    """Prepare features for the CreditCard LightGBM model."""
    pca_values = [float(data.get(f"V{i}", 0)) for i in range(1, 29)]

    time_val = float(data.get("Time", 0))
    amount_val = float(data.get("Amount", data.get("amount", 0)))

    time_scaled = (time_val - 94813.86) / 47488.15
    amount_scaled = (amount_val - 88.35) / 250.12

    v1, v2, v3, v4 = pca_values[0], pca_values[1], pca_values[2], pca_values[3]
    v12, v14, v17 = pca_values[11], pca_values[13], pca_values[16]

    v1_v2_interaction = v1 * v2
    v3_v4_interaction = v3 * v4
    pca_magnitude = np.sqrt(sum(v ** 2 for v in pca_values))
    pca_max_abs = max(abs(v) for v in pca_values)
    pca_mean_abs = np.mean([abs(v) for v in pca_values])
    amount_pca_ratio = amount_val / (pca_magnitude + 1e-8)
    amount_micro = 1 if amount_val < 1.0 else 0
    v14_v17_product = v14 * v17
    v12_v14_product = v12 * v14

    features = np.array([
        pca_values + [
            time_scaled, amount_scaled,
            v1_v2_interaction, v3_v4_interaction,
            pca_magnitude, pca_max_abs, pca_mean_abs,
            amount_pca_ratio, amount_micro,
            v14_v17_product, v12_v14_product,
        ]
    ])

    return features


# ══════════════════════════════════════════════
#  PCA FEATURE SYNTHESIS
# ══════════════════════════════════════════════
def _synthesize_pca_features(data: dict) -> dict:
    """
    Synthesize proxy V1-V28 PCA features from behavioral transaction data.

    This allows the CreditCard LightGBM model to always contribute
    to the ensemble, even when real PCA features aren't provided.

    Mapping strategy:
      - V14, V17 (top fraud indicators): driven by balance errors & amount anomaly
      - V12: driven by transaction frequency
      - V1-V4: driven by balance ratios
      - Others: near-zero noise (center of PCA space = normal)
    """
    amount = float(data.get("amount", 0))
    oldbalanceOrg = float(data.get("oldbalanceOrg", amount * 1.2))
    newbalanceOrig = float(data.get("newbalanceOrig", oldbalanceOrg - amount))
    oldbalanceDest = float(data.get("oldbalanceDest", 0))
    newbalanceDest = float(data.get("newbalanceDest", oldbalanceDest + amount))
    frequency = int(data.get("frequency", 0))
    location_change = int(data.get("location_change", 0))
    device_change = int(data.get("device_change", 0))

    # ── Calculate behavioral risk signals ──
    error_orig = (oldbalanceOrg - amount) - newbalanceOrig
    error_dest = (oldbalanceDest + amount) - newbalanceDest
    balance_drained = 1.0 if (newbalanceOrig == 0 and oldbalanceOrg > 0) else 0.0
    amount_ratio = amount / (oldbalanceOrg + 1)

    # Normalize amount to a reasonable scale (log-based)
    import math
    amount_signal = math.log1p(amount) / 12.0  # log(1M) ≈ 14, so /12 normalizes to ~1
    error_signal = math.tanh(error_orig / (amount + 1))  # -1 to 1
    dest_error_signal = math.tanh(error_dest / (amount + 1))

    # ── Map to PCA space ──
    # V14 and V17 are the strongest fraud indicators in the CreditCard model
    # In the real data: V14 < -5 and V17 < -3 are strong fraud signals
    pca = {}
    pca["V14"] = -5.0 * balance_drained + -3.0 * error_signal + -1.0 * (amount_ratio > 0.9)
    pca["V17"] = -3.0 * balance_drained + -2.0 * dest_error_signal + -0.5 * device_change
    pca["V12"] = -2.0 * (frequency > 5) + -1.5 * location_change
    pca["V1"]  = -1.5 * error_signal + 0.5 * (1 - balance_drained)
    pca["V2"]  = 0.8 * amount_signal * (-1 if balance_drained else 1)
    pca["V3"]  = -2.0 * balance_drained + 0.3 * (1 - error_signal)
    pca["V4"]  = 1.0 * amount_signal - 0.5 * device_change

    # Remaining V values: deterministic zero (center of PCA space = normal)
    for i in range(5, 29):
        key = f"V{i}"
        if key not in pca:
            pca[key] = 0.0

    # Add Time and Amount
    step = int(data.get("step", data.get("hour_of_day", 1) or 1))
    pca["Time"] = step * 3600.0  # Convert step/hour to seconds
    pca["Amount"] = amount

    return pca


# ══════════════════════════════════════════════
#  MINUTE TRANSACTION ALERT
# ══════════════════════════════════════════════
def _check_minute_transaction_alert(data: dict) -> tuple:
    """Detect high-frequency, low-amount probing patterns."""
    alerts = []
    amount = float(data.get("amount", data.get("Amount", 0)))
    frequency = int(data.get("frequency", data.get("step", 0)))
    new_balance_orig = float(data.get("newbalanceOrig", -1))

    if amount < MINUTE_TXN_AMOUNT_THRESHOLD and frequency >= MINUTE_TXN_FREQ_THRESHOLD:
        alerts.append(f"Micro-amount (${amount:.2f}) with high frequency ({frequency})")

    if new_balance_orig == 0 and amount < MINUTE_TXN_AMOUNT_THRESHOLD:
        alerts.append(f"Balance drained to $0 via small amount (${amount:.2f})")

    if amount < 1.0 and frequency > 3:
        alerts.append(f"Sub-dollar probing pattern detected")

    old_balance = float(data.get("oldbalanceOrg", 0))
    if frequency >= MINUTE_TXN_FREQ_THRESHOLD and old_balance > 0 and new_balance_orig == 0:
        alerts.append(f"Rapid balance drain: ${old_balance:,.0f} -> $0")

    return len(alerts) > 0, alerts


# ══════════════════════════════════════════════
#  LEGACY PREDICTION (FALLBACK)
# ══════════════════════════════════════════════
def _legacy_predict(data: dict) -> dict:
    """Fallback to old Isolation Forest + Random Forest if new models unavailable."""
    from utils.preprocessing import preprocess_input

    features = preprocess_input(data)
    scores = {}

    classifier_score = 0.0
    if _legacy_classifier is not None:
        try:
            proba = _legacy_classifier.predict_proba(features)[0]
            classifier_score = float(proba[1])
            scores['classifier'] = round(classifier_score, 4)
        except Exception:
            scores['classifier'] = 0.0

    isolation_score = 0.0
    if _legacy_isolation is not None:
        try:
            raw_score = _legacy_isolation.decision_function(features)[0]
            isolation_score = float(max(0, min(1, 0.5 - raw_score)))
            scores['isolation_forest'] = round(isolation_score, 4)
        except Exception:
            scores['isolation_forest'] = 0.0

    if _legacy_classifier and _legacy_isolation:
        fraud_score = 0.6 * classifier_score + 0.4 * isolation_score
    elif _legacy_classifier:
        fraud_score = classifier_score
    elif _legacy_isolation:
        fraud_score = isolation_score
    else:
        fraud_score = _rule_based_score(data)
        scores['fallback'] = round(fraud_score, 4)

    return fraud_score, scores


# ══════════════════════════════════════════════
#  MAIN PREDICT FUNCTION
# ══════════════════════════════════════════════
def predict(data: dict) -> dict:
    """
    Predict fraud score for a transaction using the Ensemble Voter.

    Backward-compatible with the old API contract:
        Input:  { amount, frequency, location_change, device_change, hour_of_day }
        Output: { fraud_score, risk_level, reason, model_scores }

    Also accepts rich inputs with balance fields for higher accuracy.
    """
    _load_models()

    scores = {}
    explanations = []

    # ══════════════════════════════════════════
    #  ENSEMBLE SCORING
    # ══════════════════════════════════════════

    # ── 1. Behavioral Model (PaySim XGBoost) ──
    behavioral_score = 0.0
    if _paysim_model is not None:
        try:
            features = _prepare_behavioral_features(data)
            proba = _paysim_model.predict_proba(features)[0]
            behavioral_score = float(proba[1])
            scores['behavioral_xgb'] = round(behavioral_score, 4)
        except Exception as e:
            scores['behavioral_xgb'] = 0.0
            explanations.append(f"Behavioral model error: {e}")

    # ── 2. Pattern Model (CreditCard LightGBM) ──
    pattern_score = 0.0
    has_pca = any(f"V{i}" in data for i in range(1, 29))
    if _creditcard_model is not None:
        try:
            # Synthesize PCA features if not provided
            if not has_pca:
                pca_data = _synthesize_pca_features(data)
                pattern_data = {**data, **pca_data}
            else:
                pattern_data = data

            features = _prepare_pattern_features(pattern_data)
            proba = _creditcard_model.predict_proba(features)[0]
            pattern_score = float(proba[1])
            scores['pattern_lgbm'] = round(pattern_score, 4)
            if not has_pca:
                scores['pca_synthesized'] = True
        except Exception as e:
            scores['pattern_lgbm'] = 0.0
            explanations.append(f"Pattern model error: {e}")

    # ── 3. Weighted Average (both models always contribute) ──
    if _paysim_model is not None:
        if _creditcard_model is not None:
            fraud_score = BEHAVIORAL_WEIGHT * behavioral_score + PATTERN_WEIGHT * pattern_score
        else:
            fraud_score = behavioral_score
    else:
        # Fallback to legacy models
        fraud_score, legacy_scores = _legacy_predict(data)
        scores.update(legacy_scores)
        explanations.append("Using legacy models (ensemble not available)")

    # ── 4. Minute Transaction Alert Override ──
    alert_triggered, alert_reasons = _check_minute_transaction_alert(data)
    if alert_triggered:
        override_score = max(fraud_score, MINUTE_TXN_OVERRIDE_SCORE)
        explanations.append(f"MINUTE TXN ALERT: score overridden {fraud_score:.4f} -> {override_score:.4f}")
        fraud_score = override_score
        scores['minute_txn_alert'] = True
        scores['alert_reasons'] = alert_reasons

    fraud_score = round(float(fraud_score), 4)

    # ── Risk level ──
    if fraud_score >= 0.7:
        risk_level = 'high'
    elif fraud_score >= 0.3:
        risk_level = 'medium'
    else:
        risk_level = 'low'

    # ── Explainability reason ──
    reason = generate_reason(data, fraud_score)
    if alert_triggered:
        reason = " | ".join(alert_reasons) + " | " + reason
    if explanations:
        reason = reason + " | " + " | ".join(explanations)

    return {
        'fraud_score': fraud_score,
        'risk_level': risk_level,
        'reason': reason,
        'model_scores': scores,
    }


def _rule_based_score(data: dict) -> float:
    """Fallback rule-based scoring when no models are available."""
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
    """Force reload models (e.g., after retraining)."""
    global _paysim_model, _creditcard_model
    global _legacy_classifier, _legacy_isolation
    global _models_loaded

    _paysim_model = None
    _creditcard_model = None
    _legacy_classifier = None
    _legacy_isolation = None
    _models_loaded = False
    _load_models()
    return True
