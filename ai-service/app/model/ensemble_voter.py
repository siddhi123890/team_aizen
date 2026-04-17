"""
Ensemble Voter — Intelligent Fraud Detection
=============================================
Final Step: Combines the Behavioral (PaySim XGBoost) and Pattern-based
(Credit Card LightGBM) models into a weighted ensemble with
Minute Transaction Alert override logic.

Architecture
------------
    ┌──────────────────┐     ┌─────────────────────┐
    │  PaySim XGBoost  │     │  CreditCard LightGBM │
    │   (Behavioral)   │     │   (Pattern-based)    │
    │   Weight: 0.60   │     │    Weight: 0.40      │
    └────────┬─────────┘     └──────────┬───────────┘
             │                          │
             └──────────┬───────────────┘
                        ▼
              ┌─────────────────┐
              │ Weighted Average │
              │   Ensemble       │
              └────────┬────────┘
                       ▼
            ┌──────────────────────┐
            │ Minute Transaction   │
            │ Alert Override       │
            └────────┬─────────────┘
                     ▼
              ┌──────────────┐
              │ FINAL VERDICT │
              │ FRAUD / SAFE  │
              └──────────────┘

Usage
-----
    python ensemble_voter.py              # interactive demo
    python ensemble_voter.py --auto       # run pre-built test cases
"""

import os
import sys
import gc
import argparse

# ── Fix Windows console encoding ──
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import warnings
import numpy as np
import joblib

warnings.filterwarnings("ignore")

# ──────────────────────────────────────────────
#  Paths
# ──────────────────────────────────────────────
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
PAYSIM_MODEL_PATH = os.path.join(MODEL_DIR, "paysim_model.pkl")
CREDITCARD_MODEL_PATH = os.path.join(MODEL_DIR, "creditcard_model.pkl")
CREDITCARD_SCALER_PATH = os.path.join(MODEL_DIR, "creditcard_scaler.pkl")

# ──────────────────────────────────────────────
#  Ensemble Weights
# ──────────────────────────────────────────────
BEHAVIORAL_WEIGHT = 0.60   # PaySim XGBoost
PATTERN_WEIGHT = 0.40      # CreditCard LightGBM
FRAUD_THRESHOLD = 0.50     # Combined probability threshold

# ──────────────────────────────────────────────
#  Minute Transaction Alert Thresholds
# ──────────────────────────────────────────────
MINUTE_TXN_AMOUNT_THRESHOLD = 5.0       # Amount below this is "micro"
MINUTE_TXN_FREQ_THRESHOLD = 8           # Frequency above this is "high"
MINUTE_TXN_BALANCE_ZERO = True          # Origin balance drops to zero
MINUTE_TXN_OVERRIDE_SCORE = 0.92        # Override score when triggered


# ══════════════════════════════════════════════
#  MODEL LOADER
# ══════════════════════════════════════════════
class EnsembleVoter:
    """
    Weighted ensemble combining Behavioral + Pattern fraud models.
    Includes Minute Transaction Alert override logic.
    """

    def __init__(self):
        self.behavioral_model = None   # PaySim XGBoost
        self.pattern_model = None      # CreditCard LightGBM
        self.cc_scaler = None          # Credit Card scaler
        self._load_models()

    def _load_models(self):
        """Load both trained models from disk."""
        print("=" * 60)
        print("  ENSEMBLE VOTER — Loading Models")
        print("=" * 60)

        # ── Behavioral Model (PaySim XGBoost) ──
        if os.path.exists(PAYSIM_MODEL_PATH):
            self.behavioral_model = joblib.load(PAYSIM_MODEL_PATH)
            print(f"  [OK] Behavioral model  : {os.path.basename(PAYSIM_MODEL_PATH)}")
        else:
            print(f"  [!!] Behavioral model NOT FOUND: {PAYSIM_MODEL_PATH}")

        # ── Pattern Model (CreditCard LightGBM) ──
        if os.path.exists(CREDITCARD_MODEL_PATH):
            self.pattern_model = joblib.load(CREDITCARD_MODEL_PATH)
            print(f"  [OK] Pattern model     : {os.path.basename(CREDITCARD_MODEL_PATH)}")
        else:
            print(f"  [!!] Pattern model NOT FOUND: {CREDITCARD_MODEL_PATH}")

        # ── Credit Card Scaler ──
        if os.path.exists(CREDITCARD_SCALER_PATH):
            self.cc_scaler = joblib.load(CREDITCARD_SCALER_PATH)
            print(f"  [OK] CC Scaler         : {os.path.basename(CREDITCARD_SCALER_PATH)}")

        print("=" * 60)

    # ══════════════════════════════════════════
    #  FEATURE PREPARATION
    # ══════════════════════════════════════════
    def _prepare_behavioral_features(self, txn: dict) -> np.ndarray:
        """
        Prepare features for the PaySim XGBoost model.

        Expected txn keys:
            type (TRANSFER/CASH_OUT), amount, oldbalanceOrg, newbalanceOrig,
            oldbalanceDest, newbalanceDest, step
        """
        txn_type = txn.get("type", "TRANSFER")
        type_enc = 1 if txn_type == "TRANSFER" else 0

        amount = float(txn.get("amount", 0))
        oldbalanceOrg = float(txn.get("oldbalanceOrg", 0))
        newbalanceOrig = float(txn.get("newbalanceOrig", 0))
        oldbalanceDest = float(txn.get("oldbalanceDest", 0))
        newbalanceDest = float(txn.get("newbalanceDest", 0))
        step = int(txn.get("step", 1))

        # Engineered features (same as training)
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

    def _prepare_pattern_features(self, txn: dict) -> np.ndarray:
        """
        Prepare features for the CreditCard LightGBM model.

        Expected txn keys:
            V1–V28, Time, Amount
        """
        # PCA components
        pca_values = [float(txn.get(f"V{i}", 0)) for i in range(1, 29)]

        time_val = float(txn.get("Time", 0))
        amount_val = float(txn.get("Amount", txn.get("amount", 0)))

        # Scale Time & Amount
        time_scaled = (time_val - 94813.86) / 47488.15   # approx mean/std from dataset
        amount_scaled = (amount_val - 88.35) / 250.12     # approx mean/std from dataset

        # Engineered features (same as training)
        v1, v2, v3, v4, v12, v14, v17 = (
            pca_values[0], pca_values[1], pca_values[2], pca_values[3],
            pca_values[11], pca_values[13], pca_values[16],
        )

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
            pca_values
            + [
                time_scaled, amount_scaled,
                v1_v2_interaction, v3_v4_interaction,
                pca_magnitude, pca_max_abs, pca_mean_abs,
                amount_pca_ratio, amount_micro,
                v14_v17_product, v12_v14_product,
            ]
        ])

        return features

    # ══════════════════════════════════════════
    #  MINUTE TRANSACTION ALERT
    # ══════════════════════════════════════════
    def _check_minute_transaction_alert(self, txn: dict) -> tuple[bool, list[str]]:
        """
        Detect high-frequency, low-amount patterns that indicate
        probing / smurfing attacks (Minute Transaction Alert).

        Returns:
            (triggered: bool, reasons: list[str])
        """
        alerts = []
        amount = float(txn.get("amount", txn.get("Amount", 0)))
        frequency = int(txn.get("frequency", txn.get("step", 0)))
        new_balance_orig = float(txn.get("newbalanceOrig", -1))

        # ── Rule 1: Micro-amount + high frequency ──
        if amount < MINUTE_TXN_AMOUNT_THRESHOLD and frequency >= MINUTE_TXN_FREQ_THRESHOLD:
            alerts.append(
                f"MINUTE TXN: Micro-amount (${amount:.2f}) with high frequency ({frequency})"
            )

        # ── Rule 2: Balance drained to zero with small transaction ──
        if new_balance_orig == 0 and amount < MINUTE_TXN_AMOUNT_THRESHOLD:
            alerts.append(
                f"MINUTE TXN: Balance drained to $0.00 via small amount (${amount:.2f})"
            )

        # ── Rule 3: Multiple micro-transactions (step-based frequency proxy) ──
        if amount < 1.0 and frequency > 3:
            alerts.append(
                f"MINUTE TXN: Sub-dollar probing pattern (${amount:.2f}, step={frequency})"
            )

        # ── Rule 4: High frequency + balance discrepancy ──
        old_balance = float(txn.get("oldbalanceOrg", 0))
        if frequency >= MINUTE_TXN_FREQ_THRESHOLD and old_balance > 0 and new_balance_orig == 0:
            alerts.append(
                f"MINUTE TXN: Rapid drain — balance ${old_balance:,.2f} -> $0.00 in {frequency} steps"
            )

        triggered = len(alerts) > 0
        return triggered, alerts

    # ══════════════════════════════════════════
    #  FINAL DECISION FUNCTION
    # ══════════════════════════════════════════
    def predict(self, txn: dict) -> dict:
        """
        Final Decision: Ensemble prediction for a single transaction.

        Args:
            txn: dict with transaction features.
                 Behavioral keys: type, amount, oldbalanceOrg, newbalanceOrig,
                                  oldbalanceDest, newbalanceDest, step
                 Pattern keys:    V1–V28, Time, Amount

        Returns:
            dict: {
                verdict: str ("FRAUD" / "SAFE"),
                combined_score: float (0–1),
                behavioral_score: float,
                pattern_score: float,
                minute_txn_alert: bool,
                alert_reasons: list[str],
                risk_level: str ("LOW" / "MEDIUM" / "HIGH" / "CRITICAL"),
                explanation: str
            }
        """
        scores = {}
        explanations = []

        # ── 1. Behavioral Model Score ──
        behavioral_score = 0.0
        if self.behavioral_model is not None:
            try:
                features = self._prepare_behavioral_features(txn)
                proba = self.behavioral_model.predict_proba(features)[0]
                behavioral_score = float(proba[1])
                scores["behavioral"] = round(behavioral_score, 4)
            except Exception as e:
                explanations.append(f"Behavioral model error: {e}")
                scores["behavioral"] = 0.0

        # ── 2. Pattern Model Score ──
        pattern_score = 0.0
        has_pca = any(f"V{i}" in txn for i in range(1, 29))
        if self.pattern_model is not None and has_pca:
            try:
                features = self._prepare_pattern_features(txn)
                proba = self.pattern_model.predict_proba(features)[0]
                pattern_score = float(proba[1])
                scores["pattern"] = round(pattern_score, 4)
            except Exception as e:
                explanations.append(f"Pattern model error: {e}")
                scores["pattern"] = 0.0

        # ── 3. Weighted Average ──
        if has_pca and self.pattern_model is not None:
            combined_score = (
                BEHAVIORAL_WEIGHT * behavioral_score
                + PATTERN_WEIGHT * pattern_score
            )
        else:
            # Only behavioral model available
            combined_score = behavioral_score
            explanations.append("Pattern model skipped (no PCA features provided)")

        # ── 4. Minute Transaction Alert Override ──
        alert_triggered, alert_reasons = self._check_minute_transaction_alert(txn)

        if alert_triggered:
            # Override: if the combined score is already suspicious, boost it
            # If not, set it to the override floor
            override_score = max(combined_score, MINUTE_TXN_OVERRIDE_SCORE)
            explanations.append(
                f"MINUTE TXN ALERT OVERRIDE: {combined_score:.4f} -> {override_score:.4f}"
            )
            combined_score = override_score

        combined_score = round(float(combined_score), 4)

        # ── 5. Final Verdict ──
        if combined_score > FRAUD_THRESHOLD:
            verdict = "FRAUD"
        else:
            verdict = "SAFE"

        # ── 6. Risk Level ──
        if combined_score >= 0.85:
            risk_level = "CRITICAL"
        elif combined_score >= 0.65:
            risk_level = "HIGH"
        elif combined_score >= 0.40:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        # ── 7. Build explanation ──
        if not explanations:
            if verdict == "FRAUD":
                explanations.append("Ensemble models detected fraudulent patterns")
            else:
                explanations.append("No significant risk factors detected")

        result = {
            "verdict": verdict,
            "combined_score": combined_score,
            "behavioral_score": round(behavioral_score, 4),
            "pattern_score": round(pattern_score, 4),
            "minute_txn_alert": alert_triggered,
            "alert_reasons": alert_reasons,
            "risk_level": risk_level,
            "explanation": " | ".join(explanations),
            "model_weights": {
                "behavioral": BEHAVIORAL_WEIGHT,
                "pattern": PATTERN_WEIGHT,
            },
        }

        return result


# ══════════════════════════════════════════════
#  DISPLAY HELPERS
# ══════════════════════════════════════════════
def display_result(txn: dict, result: dict):
    """Pretty-print the ensemble verdict."""
    verdict = result["verdict"]
    score = result["combined_score"]

    # Color-coded verdict
    if verdict == "FRAUD":
        verdict_display = "!! FRAUD DETECTED !!"
        border = "X"
    else:
        verdict_display = "SAFE — Transaction OK"
        border = "-"

    print(f"\n{'=' * 60}")
    print(f"  ENSEMBLE VERDICT")
    print(f"{'=' * 60}")
    print(f"  {border * 56}")
    print(f"  {'':>4}{verdict_display:^48}")
    print(f"  {border * 56}")
    print()
    print(f"  Combined Score   : {score:.4f}  (threshold: {FRAUD_THRESHOLD})")
    print(f"  Risk Level       : {result['risk_level']}")
    print()
    print(f"  Behavioral Score : {result['behavioral_score']:.4f}  (weight: {BEHAVIORAL_WEIGHT})")
    print(f"  Pattern Score    : {result['pattern_score']:.4f}  (weight: {PATTERN_WEIGHT})")
    print()

    if result["minute_txn_alert"]:
        print(f"  [ALERT] Minute Transaction Alert TRIGGERED:")
        for reason in result["alert_reasons"]:
            print(f"          -> {reason}")
        print()

    print(f"  Explanation: {result['explanation']}")
    print(f"{'=' * 60}")


def display_transaction(txn: dict, label: str = ""):
    """Display transaction details."""
    print(f"\n  Transaction{' — ' + label if label else ''}:")
    print(f"  {'─' * 40}")
    for key in ["type", "amount", "step", "oldbalanceOrg", "newbalanceOrig",
                 "oldbalanceDest", "newbalanceDest", "frequency"]:
        if key in txn:
            val = txn[key]
            if isinstance(val, float):
                print(f"    {key:>20s} : ${val:,.2f}" if "amount" in key.lower() or "balance" in key.lower()
                      else f"    {key:>20s} : {val}")
            else:
                print(f"    {key:>20s} : {val}")


# ══════════════════════════════════════════════
#  INTERACTIVE DEMO
# ══════════════════════════════════════════════
def interactive_demo(voter: EnsembleVoter):
    """Let the user input a transaction and get an ensemble verdict."""
    print("\n" + "=" * 60)
    print("  INTERACTIVE DEMO — Enter Transaction Details")
    print("=" * 60)
    print("  (Press Enter to use default values)\n")

    def _input_float(prompt, default):
        val = input(f"  {prompt} [{default}]: ").strip()
        return float(val) if val else default

    def _input_int(prompt, default):
        val = input(f"  {prompt} [{default}]: ").strip()
        return int(val) if val else default

    def _input_str(prompt, default):
        val = input(f"  {prompt} [{default}]: ").strip()
        return val if val else default

    txn_type = _input_str("Transaction type (TRANSFER/CASH_OUT)", "TRANSFER")
    amount = _input_float("Amount ($)", 181000.0)
    step = _input_int("Step (time period)", 1)
    oldbalanceOrg = _input_float("Old Balance (Origin)", 181000.0)
    newbalanceOrig = _input_float("New Balance (Origin)", 0.0)
    oldbalanceDest = _input_float("Old Balance (Dest)", 0.0)
    newbalanceDest = _input_float("New Balance (Dest)", 0.0)
    frequency = _input_int("Frequency (txns in window)", 1)

    txn = {
        "type": txn_type,
        "amount": amount,
        "step": step,
        "oldbalanceOrg": oldbalanceOrg,
        "newbalanceOrig": newbalanceOrig,
        "oldbalanceDest": oldbalanceDest,
        "newbalanceDest": newbalanceDest,
        "frequency": frequency,
    }

    display_transaction(txn, "Your Input")
    result = voter.predict(txn)
    display_result(txn, result)


def auto_demo(voter: EnsembleVoter):
    """Run pre-built test cases to demonstrate the ensemble."""
    test_cases = [
        {
            "label": "Normal Transfer",
            "txn": {
                "type": "TRANSFER",
                "amount": 500.0,
                "step": 50,
                "oldbalanceOrg": 10000.0,
                "newbalanceOrig": 9500.0,
                "oldbalanceDest": 2000.0,
                "newbalanceDest": 2500.0,
                "frequency": 1,
            },
        },
        {
            "label": "Suspicious Large Transfer (Balance Drained)",
            "txn": {
                "type": "TRANSFER",
                "amount": 181000.0,
                "step": 1,
                "oldbalanceOrg": 181000.0,
                "newbalanceOrig": 0.0,
                "oldbalanceDest": 0.0,
                "newbalanceDest": 0.0,
                "frequency": 1,
            },
        },
        {
            "label": "MINUTE TXN: Micro-Amount + High Frequency Probe",
            "txn": {
                "type": "CASH_OUT",
                "amount": 0.50,
                "step": 10,
                "oldbalanceOrg": 5000.0,
                "newbalanceOrig": 0.0,
                "oldbalanceDest": 100.0,
                "newbalanceDest": 100.50,
                "frequency": 12,
            },
        },
        {
            "label": "Cash-Out with Balance Discrepancy",
            "txn": {
                "type": "CASH_OUT",
                "amount": 339682.13,
                "step": 1,
                "oldbalanceOrg": 339682.13,
                "newbalanceOrig": 0.0,
                "oldbalanceDest": 0.0,
                "newbalanceDest": 339682.13,
                "frequency": 1,
            },
        },
        {
            "label": "Small Legitimate Cash-Out",
            "txn": {
                "type": "CASH_OUT",
                "amount": 25.0,
                "step": 200,
                "oldbalanceOrg": 1500.0,
                "newbalanceOrig": 1475.0,
                "oldbalanceDest": 8000.0,
                "newbalanceDest": 8025.0,
                "frequency": 1,
            },
        },
    ]

    print("\n" + "=" * 60)
    print("  ENSEMBLE VOTER — Automated Demo")
    print(f"  Running {len(test_cases)} test cases ...")
    print("=" * 60)

    for i, case in enumerate(test_cases, 1):
        print(f"\n{'#' * 60}")
        print(f"  TEST CASE {i}/{len(test_cases)}: {case['label']}")
        print(f"{'#' * 60}")

        display_transaction(case["txn"], case["label"])
        result = voter.predict(case["txn"])
        display_result(case["txn"], result)

    # ── Summary Table ──
    print(f"\n\n{'=' * 60}")
    print("  SUMMARY")
    print(f"{'=' * 60}")
    print(f"  {'#':<4} {'Label':<45} {'Verdict':<8} {'Score':<8} {'Alert'}")
    print(f"  {'─'*4} {'─'*45} {'─'*8} {'─'*8} {'─'*5}")

    for i, case in enumerate(test_cases, 1):
        r = voter.predict(case["txn"])
        alert_flag = "YES" if r["minute_txn_alert"] else ""
        print(f"  {i:<4} {case['label']:<45} {r['verdict']:<8} {r['combined_score']:<8.4f} {alert_flag}")

    print(f"{'=' * 60}\n")


# ══════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ensemble Voter — Fraud Detection")
    parser.add_argument(
        "--auto",
        action="store_true",
        help="Run automated demo with pre-built test cases",
    )
    args = parser.parse_args()

    voter = EnsembleVoter()

    if args.auto:
        auto_demo(voter)
    else:
        interactive_demo(voter)

    # Memory cleanup
    voter = None
    gc.collect()
    print("\n  Memory cleaned (gc.collect())")
