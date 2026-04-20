#!/usr/bin/env python3
"""
Predict dementia from raw audio signal features (no transcription).
Uses models saved by retrain_audio_signal.py.
"""
import os
import sys
import json
import joblib
import numpy as np

from audio_signal_features import extract_audio_features

ROOT = os.path.dirname(os.path.dirname(__file__))
MODELS_DIR = os.path.join(ROOT, "models")
SCALER_PATH = os.path.join(MODELS_DIR, "audio_scaler.joblib")
MODEL_PATH = os.path.join(MODELS_DIR, "audio_classifier.joblib")

FEATURE_COLS = [
    "duration_sec",
    "rms_mean",
    "rms_std",
    "zcr_mean",
    "zcr_std",
    "speech_ratio",
    "pause_ratio",
    "pause_count",
    "pause_rate_per_sec",
    "pause_mean_sec",
    "pause_max_sec",
    "speech_activity_per_sec",
    "centroid_mean",
    "centroid_std",
]

LABEL_MAP = {0: "Healthy", 1: "Dementia"}


def load_models():
    if not os.path.exists(SCALER_PATH) or not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Missing audio models. Train with: python3 src/retrain_audio_signal.py\n"
            f"Expected: {SCALER_PATH}, {MODEL_PATH}"
        )
    scaler = joblib.load(SCALER_PATH)
    model = joblib.load(MODEL_PATH)
    return scaler, model


def predict(audio_path):
    scaler, model = load_models()
    feats = extract_audio_features(os.path.abspath(audio_path))
    arr = np.array([feats[c] for c in FEATURE_COLS]).reshape(1, -1)
    arr_scaled = scaler.transform(arr)
    prob = model.predict_proba(arr_scaled)[0]
    pred = int(np.argmax(prob))
    confidence = float(np.max(prob))
    
    result = {
        "prediction": LABEL_MAP.get(pred, str(pred)),
        "label": pred,
        "confidence": round(confidence, 4),
        "features": {k: float(feats[k]) for k in FEATURE_COLS},
    }
    
    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: predict_audio_signal.py <audio_path>"}))
        sys.exit(1)
    
    audio_path = sys.argv[1]
    result = predict(audio_path)
    print(json.dumps(result, indent=2))

