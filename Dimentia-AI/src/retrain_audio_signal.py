#!/usr/bin/env python3
"""
Train an audio-only dementia classifier using raw signal features (pauses, energy, ZCR).
Does NOT rely on transcription.
Data is read from data/dementia (or data/dimentia) and data/healthy.
"""
import os
import sys
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
)
import joblib

ROOT = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, os.path.join(ROOT, "src"))

from audio_signal_features import extract_audio_features

DATA_ROOT = os.path.join(ROOT, "data")
MODELS_DIR = os.path.join(ROOT, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

DEMENTIA_SUBFOLDERS = ["dementia", "dimentia"]
HEALTHY_SUBFOLDER = "healthy"

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


def collect_files():
    files = []
    for sub in DEMENTIA_SUBFOLDERS:
        folder = os.path.join(DATA_ROOT, sub)
        if os.path.exists(folder):
            for root, _, names in os.walk(folder):
                for n in names:
                    if n.lower().endswith((".wav", ".mp3", ".ogg", ".flac", ".m4a", ".aac")):
                        files.append((os.path.join(root, n), 1))
    healthy_folder = os.path.join(DATA_ROOT, HEALTHY_SUBFOLDER)
    if os.path.exists(healthy_folder):
        for root, _, names in os.walk(healthy_folder):
            for n in names:
                if n.lower().endswith((".wav", ".mp3", ".ogg", ".flac", ".m4a", ".aac")):
                    files.append((os.path.join(root, n), 0))
    return files


def main():
    files = collect_files()
    if len(files) < 4:
        print(f"❌ Not enough audio files to train (found {len(files)})")
        sys.exit(1)

    print(f"Found {len(files)} audio files (dementia + healthy)")

    rows = []
    for path, label in files:
        try:
            feats = extract_audio_features(path)
            feats["label"] = label
            feats["file_path"] = path
            rows.append(feats)
        except Exception as e:
            print(f"[WARN] Skipping {path}: {e}")

    df = pd.DataFrame(rows)
    print(f"✅ Extracted features for {len(df)} files")
    if len(df) < 4:
        print("❌ Not enough usable samples after feature extraction.")
        sys.exit(1)

    X = df[FEATURE_COLS].fillna(0).values
    y = df["label"].astype(int).values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y if len(np.unique(y)) > 1 else None
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Simple, regularized model for small data
    model = LogisticRegression(
        max_iter=500,
        class_weight="balanced",
        solver="lbfgs",
    )

    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)

    print("\n📊 EVALUATION (audio-only, small-data)")
    print(f"   Accuracy : {acc*100:5.1f}%")
    print(f"   Precision: {prec*100:5.1f}%")
    print(f"   Recall   : {rec*100:5.1f}%")
    print(f"   F1-score : {f1*100:5.1f}%")

    print("\n📋 Report:")
    print(classification_report(y_test, y_pred, target_names=["Healthy", "Dementia"], zero_division=0))

    print("\n📊 Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred, labels=[0, 1])
    print(cm)

    # Save artifacts
    scaler_path = os.path.join(MODELS_DIR, "audio_scaler.joblib")
    model_path = os.path.join(MODELS_DIR, "audio_classifier.joblib")
    joblib.dump(scaler, scaler_path)
    joblib.dump(model, model_path)
    print(f"\n💾 Saved audio-only model to:\n  {model_path}\n  {scaler_path}")

    # Save features for inspection
    feats_path = os.path.join(MODELS_DIR, "audio_features.csv")
    df.to_csv(feats_path, index=False)
    print(f"💾 Saved extracted features to: {feats_path}")


if __name__ == "__main__":
    main()

