"""
Credit Card Fraud Detection (ULB) — LightGBM + SMOTE Model
============================================================
Step 2 of the intelligent fraud-detection ensemble pipeline.

Focus: Mathematical / PCA-based anomaly patterns in transactions.

Workflow
--------
1. Load & clean creditcard.csv (PCA-transformed features V1–V28 + Time, Amount).

2. Apply SMOTE oversampling to handle the extreme ~0.17% fraud ratio.
3. Train a LightGBM classifier tuned for 
 minute discrepancy detection.
4. Output classification report + Precision-Recall curve.
5. Save model as `creditcard_model.pkl`.

Usage
-----
    python train_creditcard_lgbm.py                              # default path
    python train_creditcard_lgbm.py --data /path/to/creditcard.csv
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
import pandas as pd
import joblib
import matplotlib
matplotlib.use("Agg")  # non-interactive backend (no GUI needed)
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    classification_report,
    roc_auc_score,
    average_precision_score,
    precision_recall_curve,
    f1_score,
)
from imblearn.over_sampling import SMOTE
from lightgbm import LGBMClassifier

warnings.filterwarnings("ignore", category=UserWarning)

# ──────────────────────────────────────────────
#  Paths
# ──────────────────────────────────────────────
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DATASET_PATH = os.path.join(MODEL_DIR, "creditcard.csv")
OUTPUT_MODEL_PATH = os.path.join(MODEL_DIR, "creditcard_model.pkl")
OUTPUT_SCALER_PATH = os.path.join(MODEL_DIR, "creditcard_scaler.pkl")
PR_CURVE_PATH = os.path.join(MODEL_DIR, "precision_recall_curve.png")


# ══════════════════════════════════════════════
#  1. DATA LOADING & CLEANING
# ══════════════════════════════════════════════
def load_and_clean(path: str) -> pd.DataFrame:
    """
    Load creditcard.csv and perform basic cleaning.

    Expected columns:
        Time, V1–V28, Amount, Class
    """
    print("[1/5]  Loading dataset ...")
    df = pd.read_csv(path)
    print(f"       Raw shape : {df.shape}")

    # Drop duplicates
    before = len(df)
    df.drop_duplicates(inplace=True)
    dropped = before - len(df)
    if dropped:
        print(f"       Dropped {dropped} duplicate rows.")

    # Handle NaN / inf
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    nan_count = df.isna().sum().sum()
    if nan_count > 0:
        print(f"       Filling {nan_count} NaN values with 0.")
        df.fillna(0, inplace=True)

    print(f"       Cleaned shape : {df.shape}")
    print(f"       Fraud ratio   : {df['Class'].mean() * 100:.4f}%  "
          f"({df['Class'].sum()} fraud / {len(df)} total)")
    return df


# ══════════════════════════════════════════════
#  2. FEATURE PREPROCESSING
# ══════════════════════════════════════════════
def preprocess_features(df: pd.DataFrame):
    """
    Scale Time & Amount (V1–V28 are already PCA-scaled).
    Engineer minute-discrepancy features to catch subtle anomalies.

    Returns: X (DataFrame), y (Series), scaler (fitted)
    """
    print("\n[2/5]  Preprocessing features ...")

    # ── Scale Time & Amount ──
    scaler = StandardScaler()
    df["Time_scaled"] = scaler.fit_transform(df[["Time"]])
    df["Amount_scaled"] = StandardScaler().fit_transform(df[["Amount"]])

    # ── Minute-discrepancy features ──
    # These capture subtle mathematical anomalies in the PCA space
    # that typical models might miss.

    #  Interaction between top PCA components
    df["V1_V2_interaction"] = df["V1"] * df["V2"]
    df["V3_V4_interaction"] = df["V3"] * df["V4"]

    #  Magnitude features — how far from center in PCA space
    pca_cols = [f"V{i}" for i in range(1, 29)]
    df["pca_magnitude"] = np.sqrt((df[pca_cols] ** 2).sum(axis=1))

    #  Per-component absolute deviation (flags outlier dimensions)
    df["pca_max_abs"] = df[pca_cols].abs().max(axis=1)
    df["pca_mean_abs"] = df[pca_cols].abs().mean(axis=1)

    #  Ratio of Amount to pca_magnitude (disproportionate amount for pattern)
    df["amount_pca_ratio"] = df["Amount"] / (df["pca_magnitude"] + 1e-8)

    #  Small-amount flag (micro-transactions can be probing attacks)
    df["amount_micro"] = (df["Amount"] < 1.0).astype(int)

    #  High-V component cluster (V14, V17 are known fraud-discriminators)
    df["V14_V17_product"] = df["V14"] * df["V17"]
    df["V12_V14_product"] = df["V12"] * df["V14"]

    # ── Build feature set ──
    feature_cols = (
        pca_cols
        + [
            "Time_scaled",
            "Amount_scaled",
            "V1_V2_interaction",
            "V3_V4_interaction",
            "pca_magnitude",
            "pca_max_abs",
            "pca_mean_abs",
            "amount_pca_ratio",
            "amount_micro",
            "V14_V17_product",
            "V12_V14_product",
        ]
    )

    X = df[feature_cols]
    y = df["Class"]

    # Save scaler for inference later
    joblib.dump(scaler, OUTPUT_SCALER_PATH)
    print(f"       Feature count : {len(feature_cols)}")
    print(f"       Scaler saved  : {OUTPUT_SCALER_PATH}")

    return X, y, scaler, feature_cols


# ══════════════════════════════════════════════
#  3. SMOTE OVERSAMPLING
# ══════════════════════════════════════════════
def apply_smote(X_train, y_train):
    """
    Apply SMOTE to the training set to balance the extreme class imbalance.
    Only applied to training data — test data stays untouched.
    """
    print("\n[3/5]  Applying SMOTE oversampling ...")
    print(f"       Before SMOTE : {np.bincount(y_train)}")

    smote = SMOTE(
        sampling_strategy=0.5,   # Minority becomes 50% of majority (not 1:1)
        random_state=42,
        k_neighbors=5,
    )
    X_resampled, y_resampled = smote.fit_resample(X_train, y_train)

    print(f"       After  SMOTE : {np.bincount(y_resampled)}")
    print(f"       New train size: {len(X_resampled)}")

    return X_resampled, y_resampled


# ══════════════════════════════════════════════
#  4. TRAIN LIGHTGBM MODEL
# ══════════════════════════════════════════════
def train_lightgbm(X_train, y_train, X_test, y_test, feature_cols: list) -> dict:
    """
    Train LightGBM tuned for detecting minute mathematical anomalies.
    """
    print("\n[4/5]  Training LightGBM ...")

    model = LGBMClassifier(
        n_estimators=500,
        max_depth=8,
        learning_rate=0.05,
        num_leaves=63,
        min_child_samples=20,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,          # L1 regularization
        reg_lambda=0.1,         # L2 regularization
        is_unbalance=True,      # Additional imbalance handling on top of SMOTE
        random_state=42,
        n_jobs=-1,
        verbose=-1,             # Suppress training logs
    )

    # Fit with early stopping via eval set
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        eval_metric="average_precision",
        callbacks=[
            _lgbm_log_callback(period=100),
        ],
    )

    # ── Predictions ──
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    # ── Classification report ──
    print("\n" + "=" * 60)
    print("  CLASSIFICATION REPORT  (Credit Card LightGBM)")
    print("=" * 60)
    report = classification_report(y_test, y_pred, target_names=["Normal", "Fraud"])
    print(report)

    auc = roc_auc_score(y_test, y_proba)
    ap = average_precision_score(y_test, y_proba)
    f1 = f1_score(y_test, y_pred)
    print(f"  AUC-ROC : {auc:.4f}")
    print(f"  PR-AUC  : {ap:.4f}")
    print(f"  F1      : {f1:.4f}")
    print("=" * 60)

    # ── Feature importance ──
    importances = model.feature_importances_
    imp_sorted = sorted(zip(feature_cols, importances), key=lambda x: -x[1])
    print("\n  Feature Importance (top 15):")
    for name, imp in imp_sorted[:15]:
        print(f"    {name:>25s} : {imp}")

    # ── Precision-Recall curve ──
    _plot_pr_curve(y_test, y_proba, ap)

    # ── Save model ──
    joblib.dump(model, OUTPUT_MODEL_PATH)
    print(f"\n  Model saved -> {OUTPUT_MODEL_PATH}")

    metrics = {
        "auc_roc": round(auc, 4),
        "pr_auc": round(ap, 4),
        "f1_score": round(f1, 4),
        "samples_train": len(X_train),
        "samples_test": len(X_test),
        "fraud_ratio_test": round(y_test.mean(), 6),
        "feature_importance": {n: int(i) for n, i in imp_sorted},
        "feature_columns": feature_cols,
    }

    return metrics


def _lgbm_log_callback(period=100):
    """Custom callback to log LightGBM training progress."""
    def callback(env):
        if env.iteration % period == 0 or env.iteration == env.end_iteration - 1:
            if env.evaluation_result_list:
                metric_name = env.evaluation_result_list[0][1]
                metric_val = env.evaluation_result_list[0][2]
                print(f"       [{env.iteration:>4d}]  {metric_name}: {metric_val:.6f}")
    callback.order = 10
    return callback


# ══════════════════════════════════════════════
#  5. PRECISION-RECALL CURVE
# ══════════════════════════════════════════════
def _plot_pr_curve(y_true, y_proba, ap_score: float):
    """Generate and save a Precision-Recall curve plot."""
    precision, recall, thresholds = precision_recall_curve(y_true, y_proba)

    fig, ax = plt.subplots(figsize=(10, 7))

    # ── Main PR curve ──
    ax.plot(
        recall, precision,
        color="#6366f1",
        linewidth=2.5,
        label=f"LightGBM  (PR-AUC = {ap_score:.4f})",
    )

    # ── Baseline (random classifier) ──
    fraud_ratio = y_true.mean()
    ax.axhline(
        y=fraud_ratio,
        color="#94a3b8",
        linestyle="--",
        linewidth=1,
        label=f"Baseline  (ratio = {fraud_ratio:.4f})",
    )

    # ── Styling ──
    ax.set_xlabel("Recall", fontsize=13, fontweight="bold")
    ax.set_ylabel("Precision", fontsize=13, fontweight="bold")
    ax.set_title(
        "Precision-Recall Curve — Credit Card Fraud (LightGBM + SMOTE)",
        fontsize=15,
        fontweight="bold",
        pad=15,
    )
    ax.legend(fontsize=12, loc="lower left")
    ax.set_xlim([0.0, 1.05])
    ax.set_ylim([0.0, 1.05])
    ax.grid(True, alpha=0.3)
    ax.fill_between(recall, precision, alpha=0.15, color="#6366f1")

    fig.tight_layout()
    fig.savefig(PR_CURVE_PATH, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"\n  PR Curve saved -> {PR_CURVE_PATH}")


# ══════════════════════════════════════════════
#  6. MAIN PIPELINE
# ══════════════════════════════════════════════
def run_pipeline(data_path: str | None = None) -> dict:
    """
    Execute the full Credit Card LightGBM training pipeline.

    Returns
    -------
    dict  –  Training metrics (AUC, PR-AUC, F1, feature importance, etc.)
             Ready for consumption by an ensemble orchestrator.
    """
    path = data_path or DEFAULT_DATASET_PATH

    if not os.path.exists(path):
        raise FileNotFoundError(
            f"  Credit Card dataset not found at:\n   {path}\n"
            "   Download from https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud \n"
            "   and place the CSV in the model/ directory as 'creditcard.csv'."
        )

    # 1. Load & clean
    df = load_and_clean(path)

    # 2. Preprocess & engineer features
    X, y, scaler, feature_cols = preprocess_features(df)

    # Free the original DataFrame early
    del df
    gc.collect()

    # 3. Train/test split (BEFORE SMOTE — prevents data leakage)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"\n       Train size: {len(X_train)}  |  Test size: {len(X_test)}")

    # 4. SMOTE on training data only
    X_train_sm, y_train_sm = apply_smote(X_train.values, y_train.values)

    # Free pre-SMOTE training data
    del X_train
    gc.collect()

    # 5. Train LightGBM
    metrics = train_lightgbm(
        X_train_sm, y_train_sm,
        X_test.values, y_test.values,
        feature_cols,
    )

    # ── Final memory cleanup ──
    del X_train_sm, y_train_sm, X_test, y_test, X, y
    gc.collect()
    print("\n  Memory cleaned (df=None, gc.collect())")

    return metrics


# ──────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Train Credit Card Fraud LightGBM model (SMOTE)"
    )
    parser.add_argument(
        "--data",
        type=str,
        default=None,
        help="Path to creditcard.csv (default: model/creditcard.csv)",
    )
    args = parser.parse_args()

    metrics = run_pipeline(data_path=args.data)
    print(f"\n  Final Metrics:\n{metrics}")
