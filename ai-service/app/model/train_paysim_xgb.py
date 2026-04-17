"""
PaySim (Mobile Money) — XGBoost Behavioural Fraud Detection Model
=================================================================
Step 1 of the intelligent fraud-detection ensemble pipeline.

Workflow
--------
1. Load & clean the PaySim dataset.
2. Filter to TRANSFER + CASH_OUT (where fraud actually happens).
3. Feature engineering  – 'Minute Transaction' flags, balance-delta ratios, etc.
4. Train an XGBoost classifier with class-imbalance handling.
5. Print the classification report and save the model as `paysim_model.pkl`.

Usage
-----
    python train_paysim_xgb.py                          # default path
    python train_paysim_xgb.py --data /path/to/PS.csv   # custom path
"""

import os
import sys
import gc
import argparse

# ── Fix Windows console encoding (cp1252 cannot render emoji/unicode) ──
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
import warnings
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, roc_auc_score, average_precision_score
from xgboost import XGBClassifier

warnings.filterwarnings("ignore", category=UserWarning)

# ──────────────────────────────────────────────
#  Paths
# ──────────────────────────────────────────────
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DATASET_PATH = os.path.join(MODEL_DIR, "paysim_dataset.csv")
OUTPUT_MODEL_PATH = os.path.join(MODEL_DIR, "paysim_model.pkl")


# ══════════════════════════════════════════════
#  1. DATA LOADING & BASIC CLEANING
# ══════════════════════════════════════════════
def load_and_clean(path: str) -> pd.DataFrame:
    """
    Load the PaySim CSV and perform basic cleaning.

    PaySim columns (expected):
        step, type, amount, nameOrig, nameDest,
        oldbalanceOrg, newbalanceOrig, oldbalanceDest, newbalanceDest,
        isFraud, isFlaggedFraud
    """
    print("📂  Loading dataset …")
    df = pd.read_csv(path)
    print(f"    Raw shape : {df.shape}")

    # ── Drop duplicates ──
    before = len(df)
    df.drop_duplicates(inplace=True)
    dropped = before - len(df)
    if dropped:
        print(f"    Dropped {dropped} duplicate rows.")

    # ── Drop the rarely-useful 'isFlaggedFraud' column ──
    if "isFlaggedFraud" in df.columns:
        df.drop(columns=["isFlaggedFraud"], inplace=True)

    # ── Drop identifier columns (nameOrig, nameDest) ──
    for col in ["nameOrig", "nameDest"]:
        if col in df.columns:
            df.drop(columns=[col], inplace=True)

    # ── Handle any NaN / inf values ──
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    if df.isna().sum().sum() > 0:
        print(f"    Filling {df.isna().sum().sum()} NaN values with 0.")
        df.fillna(0, inplace=True)

    print(f"    Cleaned shape : {df.shape}")
    return df


# ══════════════════════════════════════════════
#  2. FILTER FRAUD-PRONE TRANSACTION TYPES
# ══════════════════════════════════════════════
def filter_fraud_types(df: pd.DataFrame) -> pd.DataFrame:
    """Keep only TRANSFER and CASH_OUT – the types where fraud occurs."""
    fraud_types = ["TRANSFER", "CASH_OUT"]
    df = df[df["type"].isin(fraud_types)].copy()
    print(f"🔍  Filtered to {fraud_types} → {len(df)} rows")
    print(f"    Fraud distribution:\n{df['isFraud'].value_counts().to_string()}")
    return df


# ══════════════════════════════════════════════
#  3. FEATURE ENGINEERING
# ══════════════════════════════════════════════
def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create behavioural features that help the model spot fraud.

    'Minute Transaction' heuristics:
        • amount_micro       – flag if amount is suspiciously small (< 1.0)
        • orig_balance_zero  – flag if origin balance drops to zero after txn
        • dest_balance_zero  – flag if destination balance is still zero after txn
        • balance_delta_orig – actual change vs expected change (origin)
        • balance_delta_dest – actual change vs expected change (dest)
        • error_balance_orig – discrepancy: expected new balance − actual new balance (origin)
        • error_balance_dest – discrepancy: expected new balance − actual new balance (dest)
        • amount_ratio_orig  – amount / (oldbalanceOrg + 1) — relative txn size
    """
    print("⚙️   Engineering features …")

    # ── Minute-transaction flags ──
    df["amount_micro"] = (df["amount"] < 1.0).astype(int)
    df["orig_balance_zero"] = (df["newbalanceOrig"] == 0).astype(int)
    df["dest_balance_zero"] = (df["newbalanceDest"] == 0).astype(int)

    # ── Balance-change deltas ──
    df["balance_delta_orig"] = df["oldbalanceOrg"] - df["newbalanceOrig"]
    df["balance_delta_dest"] = df["newbalanceDest"] - df["oldbalanceDest"]

    # ── Error signals: expected balance vs actual balance ──
    #    If someone moved `amount` out of origin, the new balance
    #    *should* be  oldbalanceOrg − amount.  A large discrepancy is suspicious.
    df["error_balance_orig"] = (df["oldbalanceOrg"] - df["amount"]) - df["newbalanceOrig"]
    df["error_balance_dest"] = (df["oldbalanceDest"] + df["amount"]) - df["newbalanceDest"]

    # ── Relative transaction size ──
    df["amount_ratio_orig"] = df["amount"] / (df["oldbalanceOrg"] + 1)

    # ── Encode 'type' as numeric (TRANSFER=1, CASH_OUT=0) ──
    le = LabelEncoder()
    df["type_enc"] = le.fit_transform(df["type"])

    print(f"    Feature columns: {list(df.columns)}")
    return df


# ══════════════════════════════════════════════
#  4. TRAIN XGBOOST MODEL
# ══════════════════════════════════════════════
def train_xgboost(df: pd.DataFrame) -> dict:
    """
    Train an XGBClassifier with class-imbalance handling via
    `scale_pos_weight` and return evaluation metrics.
    """
    # ── Select features & target ──
    feature_cols = [
        "type_enc",
        "amount",
        "oldbalanceOrg",
        "newbalanceOrig",
        "oldbalanceDest",
        "newbalanceDest",
        "step",
        # engineered
        "amount_micro",
        "orig_balance_zero",
        "dest_balance_zero",
        "balance_delta_orig",
        "balance_delta_dest",
        "error_balance_orig",
        "error_balance_dest",
        "amount_ratio_orig",
    ]

    X = df[feature_cols]
    y = df["isFraud"]

    # ── Train / test split ──
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"\n📊  Train size: {len(X_train)}  |  Test size: {len(X_test)}")

    # ── Handle class imbalance ──
    neg, pos = np.bincount(y_train)
    scale_weight = neg / pos
    print(f"    Class ratio  →  Negatives: {neg}  |  Positives: {pos}  |  scale_pos_weight: {scale_weight:.2f}")

    # ── XGBoost ──
    print("\n🚀  Training XGBoost …")
    model = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.1,
        scale_pos_weight=scale_weight,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="auc",
        use_label_encoder=False,
        random_state=42,
        n_jobs=-1,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=50,
    )

    # ── Evaluation ──
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    print("\n" + "=" * 60)
    print("  CLASSIFICATION REPORT  (PaySim XGBoost)")
    print("=" * 60)
    report = classification_report(y_test, y_pred, target_names=["Normal", "Fraud"])
    print(report)

    auc = roc_auc_score(y_test, y_proba)
    ap = average_precision_score(y_test, y_proba)
    print(f"  AUC-ROC : {auc:.4f}")
    print(f"  PR-AUC  : {ap:.4f}")
    print("=" * 60)

    # ── Feature importance ──
    importances = model.feature_importances_
    imp_sorted = sorted(zip(feature_cols, importances), key=lambda x: -x[1])
    print("\n🔑  Feature Importance:")
    for name, imp in imp_sorted:
        print(f"    {name:>25s} : {imp:.4f}")

    # ── Save model ──
    joblib.dump(model, OUTPUT_MODEL_PATH)
    print(f"\n💾  Model saved → {OUTPUT_MODEL_PATH}")

    metrics = {
        "auc_roc": round(auc, 4),
        "pr_auc": round(ap, 4),
        "samples_train": len(X_train),
        "samples_test": len(X_test),
        "fraud_ratio": round(y.mean(), 6),
        "feature_importance": {n: round(float(i), 4) for n, i in imp_sorted},
        "feature_columns": feature_cols,
    }

    return metrics


# ══════════════════════════════════════════════
#  5. MAIN ENTRY POINT
# ══════════════════════════════════════════════
def run_pipeline(data_path: str | None = None) -> dict:
    """
    Execute the full PaySim XGBoost training pipeline.

    Returns
    -------
    dict  –  Training metrics (AUC, PR-AUC, feature importance, etc.)
             Ready for consumption by an ensemble orchestrator.
    """
    path = data_path or DEFAULT_DATASET_PATH

    if not os.path.exists(path):
        raise FileNotFoundError(
            f"❌  PaySim dataset not found at:\n   {path}\n"
            "   Download it from https://www.kaggle.com/datasets/ealaxi/paysim1 \n"
            "   and place the CSV in the model/ directory as 'paysim_dataset.csv'."
        )

    # 1. Load & clean
    df = load_and_clean(path)

    # 2. Filter to fraud-prone types
    df = filter_fraud_types(df)

    # 3. Feature engineering
    df = engineer_features(df)

    # 4. Train XGBoost
    metrics = train_xgboost(df)

    # ── Memory cleanup (as requested) ──
    df = None          # release DataFrame reference
    gc.collect()       # force garbage collection
    print("\n🧹  Memory cleaned (df=None, gc.collect())")

    return metrics


# ──────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train PaySim XGBoost fraud model")
    parser.add_argument(
        "--data",
        type=str,
        default=None,
        help="Path to the PaySim CSV file (default: model/paysim_dataset.csv)",
    )
    args = parser.parse_args()

    metrics = run_pipeline(data_path=args.data)
    print(f"\n📈  Final Metrics:\n{metrics}")
