#!/usr/bin/env python3
"""
Fast retraining with Phase 1 features - optimized for speed
Uses LogisticRegression instead of GradientBoosting for faster training
"""
import os
import sys
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
from scipy.sparse import hstack
import joblib

ROOT = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, os.path.join(ROOT, 'src'))
from preprocess_text import compute_features_for_text

PROCESSED_CSV = os.path.join(ROOT, "transcripts", "processed_data.csv")
MODELS_DIR = os.path.join(ROOT, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

print("\n" + "="*70)
print("🚀 FAST RETRAINING WITH PHASE 1 FEATURES")
print("="*70)

# Load data
print("\n📊 Loading data...")
df = pd.read_csv(PROCESSED_CSV, encoding="utf-8")
df = df[df["transcript"].str.strip().astype(bool)].reset_index(drop=True)
print(f"✅ Loaded {len(df)} samples")

# Extract features
print("\n🔍 Extracting features...")
features_list = []
for idx, transcript in enumerate(df["transcript"]):
    if idx % 2000 == 0:
        print(f"   Processing {idx}/{len(df)}...")
    features = compute_features_for_text(transcript)
    features_list.append(features)

features_df = pd.DataFrame(features_list)
# Merge with original data, but only keep the new computed features (remove duplicates)
for col in features_df.columns:
    if col not in df.columns:
        df[col] = features_df[col]
    else:
        df[col] = features_df[col]  # Replace with newly computed
print(f"✅ Features extracted!")

# Prepare data
print("\n📋 Preparing data...")
X_text = df["transcript"].values
y = df["label"].astype(int).values

numeric_cols = [
    "num_words", "avg_word_length", "uniq_word_ratio",
    "filler_count", "pronoun_count", "stopword_ratio", "sentences_count",
    "repetition_ratio", "speech_rate", "article_ratio", "self_correction_count"
]
X_num = df[numeric_cols].fillna(0).values.astype(float)

X_text_train, X_text_test, X_num_train, X_num_test, y_train, y_test = train_test_split(
    X_text, X_num, y, test_size=0.2, random_state=42, stratify=y
)

print(f"✅ Split: {len(X_text_train)} train, {len(X_text_test)} test")

# TF-IDF
print("\n🔄 TF-IDF vectorization...")
vectorizer = TfidfVectorizer(max_features=2000, min_df=2, max_df=0.95)
X_text_train_vec = vectorizer.fit_transform(X_text_train)
X_text_test_vec = vectorizer.transform(X_text_test)
print(f"✅ Vocab size: {len(vectorizer.get_feature_names_out())}")

# Scale
print("\n📏 Scaling...")
scaler = StandardScaler()
X_num_train_scaled = scaler.fit_transform(X_num_train)
X_num_test_scaled = scaler.transform(X_num_test)

# Combine
print("\n🔗 Combining features...")
X_train = hstack([X_text_train_vec, X_num_train_scaled]).toarray()
X_test = hstack([X_text_test_vec, X_num_test_scaled]).toarray()
print(f"✅ Combined shape: {X_train.shape}")

# Train
print("\n" + "="*70)
print("🤖 TRAINING LOGISTIC REGRESSION")
print("="*70)

model = LogisticRegression(
    max_iter=1000,
    multi_class='multinomial',
    solver='lbfgs',
    random_state=42,
    n_jobs=-1,
    verbose=1
)

print("\n⏳ Training...")
model.fit(X_train, y_train)
print("✅ Model trained!")

# Evaluate
print("\n" + "="*70)
print("📊 EVALUATION")
print("="*70)

y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)
prec = precision_score(y_test, y_pred, average='weighted', zero_division=0)
rec = recall_score(y_test, y_pred, average='weighted', zero_division=0)
f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)

print(f"\n✅ Metrics:")
print(f"   Accuracy:  {acc*100:6.2f}%")
print(f"   Precision: {prec*100:6.2f}%")
print(f"   Recall:    {rec*100:6.2f}%")
print(f"   F1-Score:  {f1*100:6.2f}%")

print(f"\n📋 Report:")
print(classification_report(y_test, y_pred, target_names=['Healthy', 'MCI', 'Moderate', 'Severe'], zero_division=0))

# Save
print("\n" + "="*70)
print("💾 SAVING MODELS")
print("="*70)

vectorizer_path = os.path.join(MODELS_DIR, "tfidf_vectorizer.joblib")
scaler_path = os.path.join(MODELS_DIR, "scaler.joblib")
model_path = os.path.join(MODELS_DIR, "classifier.joblib")

joblib.dump(vectorizer, vectorizer_path)
joblib.dump(scaler, scaler_path)
joblib.dump(model, model_path)

print(f"\n✅ Models saved!")
print(f"   Vectorizer: {vectorizer_path}")
print(f"   Scaler:     {scaler_path}")
print(f"   Model:      {model_path}")

print("\n" + "="*70)
print("✨ RETRAINING COMPLETE!")
print("="*70)
print(f"\n✅ Model accuracy: {acc*100:.2f}%")
print(f"✅ Ready for prediction!")
print("\n🚀 Restart backend and frontend to use new model")
print("="*70 + "\n")
