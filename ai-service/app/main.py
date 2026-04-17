"""
FastAPI AI Fraud Detection Service — v2 (Ensemble Voter)
=========================================================
Provides ML-based fraud prediction using:
  - PaySim XGBoost (Behavioral model, 60% weight)
  - CreditCard LightGBM (Pattern model, 40% weight)
  - Minute Transaction Alert override logic

Backward-compatible with the existing backend API contract.
"""

import os
import sys

# Ensure the app directory is in the Python path
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List

from model.predict import predict, reload_models
from model.train import train_models

# ──────────────── FastAPI App ────────────────
app = FastAPI(
    title="AI Fraud Detection Service",
    description="Ensemble fraud detection: PaySim XGBoost (Behavioral) + CreditCard LightGBM (Pattern) + Minute Transaction Alert",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────── Pydantic Models ────────────────
class PredictionRequest(BaseModel):
    """
    Transaction data for fraud prediction.

    Required: amount
    Optional: all other fields (defaults will be used for missing fields)

    Supports both simple inputs (backward-compatible with v1):
        { amount, frequency, location_change, device_change }

    And rich inputs for higher accuracy:
        { amount, type, oldbalanceOrg, newbalanceOrig, ... }
    """
    # ── Core fields (backward-compatible) ──
    amount: float = Field(..., gt=0, description="Transaction amount in USD")
    frequency: int = Field(default=0, ge=0, description="Number of transactions in last 5 minutes")
    location_change: int = Field(default=0, ge=0, le=1, description="1 if location changed, 0 otherwise")
    device_change: int = Field(default=0, ge=0, le=1, description="1 if device changed, 0 otherwise")
    hour_of_day: Optional[int] = Field(default=None, ge=0, le=23, description="Hour of the day (0-23)")

    # ── Rich fields (for ensemble accuracy) ──
    type: Optional[str] = Field(default=None, description="Transaction type: TRANSFER or CASH_OUT")
    step: Optional[int] = Field(default=None, description="Time step unit")
    oldbalanceOrg: Optional[float] = Field(default=None, description="Origin account balance before")
    newbalanceOrig: Optional[float] = Field(default=None, description="Origin account balance after")
    oldbalanceDest: Optional[float] = Field(default=None, description="Destination account balance before")
    newbalanceDest: Optional[float] = Field(default=None, description="Destination account balance after")


class PredictionResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    fraud_score: float
    risk_level: str
    reason: str
    model_scores: dict


class TrainResponse(BaseModel):
    success: bool
    message: str
    metrics: dict


# ──────────────── Startup Event ────────────────
@app.on_event("startup")
async def startup_event():
    """Load ensemble models on startup."""
    print("\n" + "=" * 60)
    print("  AI FRAUD DETECTION SERVICE v2.0 — Starting")
    print("=" * 60)

    paysim_path = os.path.join(os.path.dirname(__file__), 'model', 'paysim_model.pkl')
    creditcard_path = os.path.join(os.path.dirname(__file__), 'model', 'creditcard_model.pkl')
    legacy_path = os.path.join(os.path.dirname(__file__), 'model', 'model.pkl')

    has_ensemble = os.path.exists(paysim_path) or os.path.exists(creditcard_path)
    has_legacy = os.path.exists(legacy_path)

    if has_ensemble:
        print("  Loading Ensemble Voter models ...")
        reload_models()
        print("  [OK] Ensemble models loaded successfully!")
    elif has_legacy:
        print("  [!!] Ensemble models not found. Loading legacy models ...")
        reload_models()
        print("  [OK] Legacy models loaded (fallback mode)")
    else:
        print("  [!!] No models found. Training legacy models ...")
        try:
            train_models()
            reload_models()
            print("  [OK] Models auto-trained and loaded!")
        except Exception as e:
            print(f"  [!!] Auto-training failed: {e}")
            print("  Service will use rule-based fallback scoring.")

    print("=" * 60 + "\n")


# ──────────────── Endpoints ────────────────

@app.get("/")
async def root():
    return {
        "service": "AI Fraud Detection",
        "version": "2.0.0",
        "engine": "Ensemble Voter (PaySim XGBoost + CreditCard LightGBM)",
        "status": "running",
        "endpoints": {
            "predict": "POST /predict",
            "train": "POST /train",
            "health": "GET /health",
            "reload": "POST /reload",
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    model_dir = os.path.join(os.path.dirname(__file__), 'model')

    paysim_loaded = os.path.exists(os.path.join(model_dir, 'paysim_model.pkl'))
    creditcard_loaded = os.path.exists(os.path.join(model_dir, 'creditcard_model.pkl'))
    legacy_loaded = os.path.exists(os.path.join(model_dir, 'model.pkl'))

    return {
        "status": "healthy",
        "engine": "ensemble" if paysim_loaded else ("legacy" if legacy_loaded else "fallback"),
        "models": {
            "paysim_xgboost": paysim_loaded,
            "creditcard_lightgbm": creditcard_loaded,
            "legacy_random_forest": legacy_loaded,
        },
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict_fraud(request: PredictionRequest):
    """
    Predict fraud score for a transaction using the Ensemble Voter.

    Returns fraud_score (0-1), risk_level, explainability reason,
    and individual model scores.
    """
    try:
        data = request.model_dump(exclude_none=True)
        result = predict(data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/train", response_model=TrainResponse)
async def train_model():
    """
    Retrain the fraud detection models.

    Note: This retrains the legacy models. For ensemble models,
    run train_paysim_xgb.py and train_creditcard_lgbm.py separately.
    """
    try:
        metrics = train_models()
        reload_models()

        return {
            "success": True,
            "message": "Models retrained successfully",
            "metrics": metrics,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@app.post("/reload")
async def reload():
    """Reload models from disk (useful after external training)."""
    try:
        reload_models()
        return {"success": True, "message": "Models reloaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reload failed: {str(e)}")
