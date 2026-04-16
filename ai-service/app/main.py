"""
FastAPI AI Fraud Detection Service
Provides ML-based fraud prediction and model training endpoints
"""

import os
import sys

# Ensure the app directory is in the Python path
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

from model.predict import predict, reload_models
from model.train import train_models

# ──────────────── FastAPI App ────────────────
app = FastAPI(
    title="AI Fraud Detection Service",
    description="ML-powered fraud detection with Isolation Forest + Random Forest ensemble",
    version="1.0.0",
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
    amount: float = Field(..., gt=0, description="Transaction amount in USD")
    frequency: int = Field(default=0, ge=0, description="Number of transactions in last 5 minutes")
    location_change: int = Field(default=0, ge=0, le=1, description="1 if location changed, 0 otherwise")
    device_change: int = Field(default=0, ge=0, le=1, description="1 if device changed, 0 otherwise")
    hour_of_day: Optional[int] = Field(default=None, ge=0, le=23, description="Hour of the day (0-23)")


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
    """Auto-train model on startup if model files don't exist"""
    model_path = os.path.join(os.path.dirname(__file__), 'model', 'model.pkl')
    if not os.path.exists(model_path):
        print("🧠 No trained model found. Auto-training on startup...")
        try:
            train_models()
            print("✅ Model auto-trained successfully!")
        except Exception as e:
            print(f"⚠️ Auto-training failed: {e}")
            print("   The service will use rule-based fallback scoring.")
    else:
        print("✅ Trained model found. Loading...")
        reload_models()


# ──────────────── Endpoints ────────────────

@app.get("/")
async def root():
    return {
        "service": "AI Fraud Detection",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "predict": "POST /predict",
            "train": "POST /train",
            "health": "GET /health",
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    model_path = os.path.join(os.path.dirname(__file__), 'model', 'model.pkl')
    model_loaded = os.path.exists(model_path)

    return {
        "status": "healthy",
        "model_loaded": model_loaded,
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict_fraud(request: PredictionRequest):
    """
    Predict fraud score for a transaction

    Returns fraud_score (0-1), risk_level, explainability reason, and individual model scores
    """
    try:
        data = request.model_dump()
        result = predict(data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/train", response_model=TrainResponse)
async def train_model():
    """
    Retrain the fraud detection models

    Generates synthetic data if no dataset exists, then trains both
    Isolation Forest and Random Forest models
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
    """Reload models from disk (useful after external training)"""
    try:
        reload_models()
        return {"success": True, "message": "Models reloaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reload failed: {str(e)}")
