#!/usr/bin/env python3
"""
Retrain model with Phase 1 enhanced features
Uses original training data with 4 new linguistic features for better accuracy
"""
import os
import sys
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report, roc_auc_score
)
from scipy.sparse import hstack
import joblib

# Add src to path
ROOT = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, os.path.join(ROOT, 'src'))
from preprocess_text import compute_features_for_text

PROCESSED_CSV = os.path.join(ROOT, "transcripts", "processed_data.csv")
MODELS_DIR = os.path.join(ROOT, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

print("\n" + "="*70)
print("🔄 RETRAINING MODEL WITH PHASE 1 ENHANCED FEATURES")
print("="*70)

# ============== LOAD DATA ==============
print("\n📊 Loading training data...")
if not os.path.exists(PROCESSED_CSV):
    print(f"❌ Error: {PROCESSED_CSV} not found!")
    sys.exit(1)

df = pd.read_csv(PROCESSED_CSV, encoding="utf-8")
df = df[df["transcript"].str.strip().astype(bool)].reset_index(drop=True)

print(f"✅ Loaded {len(df)} samples")
print(f"   Label distribution: {dict(df['label'].value_counts())}")

# ============== EXTRACT NEW FEATURES ==============
print("\n🔍 Extracting Phase 1 enhanced features...")
print("   Adding: repetition_ratio, speech_rate, article_ratio, self_correction_count")

features_list = []
for idx, transcript in enumerate(df["transcript"]):
    if idx % 1000 == 0:
        print(f"   Processing {idx}/{len(df)}...", end='\r')
    features = compute_features_for_text(transcript)
    features_list.append(features)

features_df = pd.DataFrame(features_list)
df = pd.concat([df, features_df], axis=1)

print(f"\n✅ Features extracted successfully!")
print(f"   Total columns: {len(df.columns)}")
print(f"   Columns: {', '.join(df.columns)}")

# ============== PREPARE DATA ==============
print("\n📋 Preparing training data...")

X_text = df["transcript"].values
y = df["label"].astype(int).values

# NEW feature order with Phase 1 features
numeric_cols = [
    "num_words",
    "avg_word_length",
    "uniq_word_ratio",
    "filler_count",
    "pronoun_count",
    "stopword_ratio",
    "sentences_count",
    "repetition_ratio",
    "speech_rate",
    "article_ratio",
    "self_correction_count",
]

print(f"   Using {len(numeric_cols)} numeric features:")
for i, col in enumerate(numeric_cols, 1):
    print(f"      {i:2d}. {col}")

X_num = df[numeric_cols].fillna(0).values.astype(float)

# Split data
X_text_train, X_text_test, X_num_train, X_num_test, y_train, y_test = train_test_split(
    X_text, X_num, y, test_size=0.2, random_state=42, stratify=y
)

print(f"\n✅ Data split:")
print(f"   Training set: {len(X_text_train)} samples")
print(f"   Test set:     {len(X_text_test)} samples")

# ============== VECTORIZE TEXT ==============
print("\n🔄 Creating TF-IDF vectorizer...")
vectorizer = TfidfVectorizer(
    max_features=2000,
    min_df=2,
    max_df=0.95,
    ngram_range=(1, 2),
    strip_accents='unicode',
    lowercase=True
)

X_text_train_vec = vectorizer.fit_transform(X_text_train)
X_text_test_vec = vectorizer.transform(X_text_test)

print(f"✅ TF-IDF vectorization complete!")
print(f"   Vocabulary size: {len(vectorizer.get_feature_names_out())}")
print(f"   Training matrix shape: {X_text_train_vec.shape}")

# ============== SCALE NUMERIC FEATURES ==============
print("\n📏 Scaling numeric features...")
scaler = StandardScaler()
X_num_train_scaled = scaler.fit_transform(X_num_train)
X_num_test_scaled = scaler.transform(X_num_test)

# ============== COMBINE FEATURES ==============
print("\n🔗 Combining TF-IDF and numeric features...")
X_train = hstack([X_text_train_vec, X_num_train_scaled]).toarray()
X_test = hstack([X_text_test_vec, X_num_test_scaled]).toarray()

print(f"✅ Combined feature matrix:")
print(f"   Training shape: {X_train.shape}")
print(f"   Test shape:     {X_test.shape}")

# ============== TRAIN MODEL ==============
print("\n" + "="*70)
print("🤖 TRAINING GRADIENT BOOSTING MODEL")
print("="*70)

model = GradientBoostingClassifier(
    n_estimators=50,
    learning_rate=0.1,
    max_depth=4,
    min_samples_split=10,
    min_samples_leaf=5,
    subsample=0.8,
    random_state=42,
    verbose=0
)

print("\n⏳ Fitting model (this may take 2-3 minutes)...")
model.fit(X_train, y_train)
print("✅ Model fitted!")

print("\n✅ Model trained!")

# ============== CROSS-VALIDATION ==============
print("\n🔄 Cross-validation (5-fold)...")
cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='f1_weighted')
print(f"✅ Mean F1-Score: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

# ============== EVALUATE ==============
print("\n" + "="*70)
print("📊 MODEL EVALUATION")
print("="*70)

y_pred = model.predict(X_test)
y_proba = model.predict_proba(X_test)

acc = accuracy_score(y_test, y_pred)
prec = precision_score(y_test, y_pred, average='weighted')
rec = recall_score(y_test, y_pred, average='weighted')
f1 = f1_score(y_test, y_pred, average='weighted')

print(f"\n✅ Performance Metrics:")
print(f"   Accuracy:  {acc*100:6.2f}%")
print(f"   Precision: {prec*100:6.2f}%")
print(f"   Recall:    {rec*100:6.2f}%")
print(f"   F1-Score:  {f1*100:6.2f}%")

try:
    roc_auc = roc_auc_score(y_test, y_proba[:, 1], average='weighted')
    print(f"   ROC-AUC:   {roc_auc:.4f}")
except:
    pass

# Confusion matrix
cm = confusion_matrix(y_test, y_pred)
print(f"\n📊 Confusion Matrix:")
print(f"   True Negatives:  {cm[0,0]:4d}")
print(f"   False Positives: {cm[0,1]:4d}")
print(f"   False Negatives: {cm[1,0]:4d}")
print(f"   True Positives:  {cm[1,1]:4d}")

print(f"\n📋 Classification Report:")
print(classification_report(y_test, y_pred, target_names=['Healthy', 'MCI', 'Moderate', 'Severe'], digits=4))

# ============== SAVE MODELS ==============
print("\n" + "="*70)
print("💾 SAVING MODELS")
print("="*70)

vectorizer_path = os.path.join(MODELS_DIR, "tfidf_vectorizer.joblib")
scaler_path = os.path.join(MODELS_DIR, "scaler.joblib")
model_path = os.path.join(MODELS_DIR, "classifier.joblib")

joblib.dump(vectorizer, vectorizer_path)
joblib.dump(scaler, scaler_path)
joblib.dump(model, model_path)

print(f"\n✅ Models saved:")
print(f"   {vectorizer_path}")
print(f"   {scaler_path}")
print(f"   {model_path}")

# ============== FEATURE IMPORTANCE ==============
print("\n" + "="*70)
print("🎯 TOP FEATURES BY IMPORTANCE")
print("="*70)

# Get feature importances from the model
importances = model.feature_importances_

# TF-IDF features
feature_names = vectorizer.get_feature_names_out()
tfidf_importances = importances[:len(feature_names)]
numeric_importances = importances[len(feature_names):]

# Top TF-IDF terms
top_tfidf_indices = np.argsort(tfidf_importances)[-10:][::-1]
print(f"\n📊 Top 10 TF-IDF Terms:")
for i, idx in enumerate(top_tfidf_indices, 1):
    print(f"   {i:2d}. {feature_names[idx]:20s} - {tfidf_importances[idx]:.6f}")

# Top numeric features
print(f"\n📊 Numeric Features Importance:")
for i, col in enumerate(numeric_cols):
    print(f"   {col:25s} - {numeric_importances[i]:.6f}")

# ============== SUMMARY ==============
print("\n" + "="*70)
print("✨ RETRAINING COMPLETE!")
print("="*70)
print(f"\n✅ Model updated with Phase 1 features")
print(f"   • 4 new linguistic features added")
print(f"   • Model accuracy: {acc*100:.2f}%")
print(f"   • Ready for prediction!")
print(f"\n🚀 Restart backend and frontend to use the new model")
print("="*70 + "\n")
