#!/usr/bin/env python3
"""
Improved model retraining script to fix bias towards Healthy class
Addresses issues:
1. Class imbalance with class weights
2. Overfitting with better regularization
3. Additional dementia-specific features
4. Per-class evaluation metrics
"""
import os
import sys
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report, roc_auc_score
)
from sklearn.utils.class_weight import compute_class_weight
from scipy.sparse import hstack
import joblib
from collections import Counter

# Add src to path
ROOT = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, os.path.join(ROOT, 'src'))
from preprocess_text import compute_features_for_text

PROCESSED_CSV = os.path.join(ROOT, "transcripts", "processed_data.csv")
MODELS_DIR = os.path.join(ROOT, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

print("\n" + "="*70)
print("🔄 IMPROVED MODEL RETRAINING - FIXING BIAS TOWARDS HEALTHY CLASS")
print("="*70)

# ============== LOAD DATA ==============
print("\n📊 Loading training data...")
if not os.path.exists(PROCESSED_CSV):
    print(f"❌ Error: {PROCESSED_CSV} not found!")
    sys.exit(1)

df = pd.read_csv(PROCESSED_CSV, encoding="utf-8")
df = df[df["transcript"].str.strip().astype(bool)].reset_index(drop=True)

print(f"✅ Loaded {len(df)} samples")
print(f"\n📊 Class Distribution:")
label_counts = df['label'].value_counts().sort_index()
LABEL_NAMES = {0: "Healthy", 1: "MCI", 2: "Moderate", 3: "Severe"}
for label, count in label_counts.items():
    pct = (count / len(df)) * 100
    print(f"   {LABEL_NAMES.get(label, f'Class {label}')}: {count:4d} ({pct:5.2f}%)")

# ============== EXTRACT FEATURES ==============
print("\n🔍 Extracting features...")
features_list = []
for idx, transcript in enumerate(df["transcript"]):
    if idx % 1000 == 0:
        print(f"   Processing {idx}/{len(df)}...", end='\r')
    features = compute_features_for_text(transcript)
    features_list.append(features)

features_df = pd.DataFrame(features_list)
# Drop old feature columns if they exist, then add fresh ones
feature_cols_to_drop = [col for col in df.columns if col not in ['transcript', 'label']]
if feature_cols_to_drop:
    df = df.drop(columns=feature_cols_to_drop)
df = pd.concat([df, features_df], axis=1)

print(f"\n✅ Features extracted successfully!")

# ============== ADD ADDITIONAL DEMENTIA-SPECIFIC FEATURES ==============
print("\n🔍 Adding additional dementia-specific features...")

def content_word_ratio(text):
    """Ratio of content words (nouns, verbs) vs function words"""
    # Simple heuristic: content words are longer and not stopwords
    words = text.lower().split()
    if len(words) == 0:
        return 0.0
    content_words = [w for w in words if len(w) > 3 and w not in ["the", "and", "but", "for", "with", "that", "this"]]
    return len(content_words) / len(words)

def filler_per_sentence(text):
    """Average fillers per sentence"""
    features = compute_features_for_text(text)
    fillers = features['filler_count']
    sentences = max(features['sentences_count'], 1)  # Avoid division by zero
    return fillers / sentences

def pronoun_to_noun_ratio(text):
    """Ratio of pronouns to total words - dementia patients use more pronouns"""
    features = compute_features_for_text(text)
    pronouns = features['pronoun_count']
    words = features['num_words']
    return pronouns / words if words > 0 else 0.0

# Add new features
df['content_word_ratio'] = df['transcript'].apply(content_word_ratio)
df['filler_per_sentence'] = df['transcript'].apply(filler_per_sentence)
df['pronoun_to_noun_ratio'] = df['transcript'].apply(pronoun_to_noun_ratio)

print("   ✅ Added: content_word_ratio, filler_per_sentence, pronoun_to_noun_ratio")

# ============== PREPARE DATA ==============
print("\n📋 Preparing training data...")

X_text = df["transcript"].values
y = df["label"].astype(int).values

# Extended feature list with new features
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
    "content_word_ratio",
    "filler_per_sentence",
    "pronoun_to_noun_ratio",
]

print(f"   Using {len(numeric_cols)} numeric features")

X_num = df[numeric_cols].fillna(0).values.astype(float)

# Split data with stratification
X_text_train, X_text_test, X_num_train, X_num_test, y_train, y_test = train_test_split(
    X_text, X_num, y, test_size=0.2, random_state=42, stratify=y
)

print(f"\n✅ Data split:")
print(f"   Training set: {len(X_text_train)} samples")
print(f"   Test set:     {len(X_text_test)} samples")

# ============== COMPUTE CLASS WEIGHTS ==============
print("\n⚖️ Computing class weights to handle imbalance...")
unique_labels = np.unique(y_train)
class_weights = compute_class_weight('balanced', classes=unique_labels, y=y_train)
class_weight_dict = dict(zip(unique_labels, class_weights))

print("   Class weights:")
for label, weight in class_weight_dict.items():
    print(f"      {LABEL_NAMES.get(label, f'Class {label}')}: {weight:.3f}")

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

# ============== TRAIN MODEL WITH CLASS WEIGHTS ==============
print("\n" + "="*70)
print("🤖 TRAINING IMPROVED GRADIENT BOOSTING MODEL")
print("="*70)

# Create sample weights from class weights
sample_weights = np.array([class_weight_dict[y] for y in y_train])

model = GradientBoostingClassifier(
    n_estimators=200,  # More trees for better generalization
    learning_rate=0.05,  # Lower learning rate to prevent overfitting
    max_depth=5,  # Slightly deeper for better feature interactions
    min_samples_split=20,  # Higher to prevent overfitting
    min_samples_leaf=10,  # Higher to prevent overfitting
    subsample=0.8,  # Use 80% of samples per tree
    max_features='sqrt',  # Use sqrt of features per tree
    random_state=42,
    verbose=1
)

print("\n⏳ Fitting model with class weights (this may take 5-10 minutes)...")
model.fit(X_train, y_train, sample_weight=sample_weights)
print("✅ Model fitted!")

# ============== CROSS-VALIDATION ==============
print("\n🔄 Cross-validation (5-fold)...")
print("   Note: Cross-validation uses model trained with class weights")
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
# Note: We skip sample_weight in CV since model is already trained with them
# This gives us an estimate of generalization performance
cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring='f1_weighted')
print(f"✅ Mean F1-Score: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

# ============== EVALUATE ==============
print("\n" + "="*70)
print("📊 MODEL EVALUATION")
print("="*70)

y_pred = model.predict(X_test)
y_proba = model.predict_proba(X_test)

acc = accuracy_score(y_test, y_pred)
prec = precision_score(y_test, y_pred, average='weighted', zero_division=0)
rec = recall_score(y_test, y_pred, average='weighted', zero_division=0)
f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)

print(f"\n✅ Overall Performance Metrics:")
print(f"   Accuracy:  {acc*100:6.2f}%")
print(f"   Precision: {prec*100:6.2f}%")
print(f"   Recall:    {rec*100:6.2f}%")
print(f"   F1-Score:  {f1*100:6.2f}%")

# Per-class metrics
print(f"\n📊 Per-Class Performance:")
present_labels = sorted(np.unique(np.concatenate([y_train, y_test])))
target_names = [LABEL_NAMES.get(i, f"Class {i}") for i in present_labels]
print(classification_report(y_test, y_pred, labels=present_labels,
                          target_names=target_names,
                          digits=4, zero_division=0))

# Confusion matrix (only for present labels)
cm = confusion_matrix(y_test, y_pred, labels=present_labels)
print(f"\n📊 Confusion Matrix:")
print("   " + " ".join([f"{LABEL_NAMES.get(i, f'Class {i}'):>10s}" for i in present_labels]))
for i, row in enumerate(cm):
    print(f"   {LABEL_NAMES.get(present_labels[i], f'Class {present_labels[i]}'):>10s} " + " ".join([f"{val:10d}" for val in row]))

# Analyze false negatives (dementia predicted as healthy)
print(f"\n🔍 False Negatives Analysis (Dementia predicted as Healthy):")
fn_mask = (y_test != 0) & (y_pred == 0)
fn_count = fn_mask.sum()
if fn_count > 0:
    print(f"   ⚠️ Found {fn_count} dementia cases incorrectly predicted as Healthy")
    print(f"   This is the main issue we're fixing!")
    # Show some examples
    fn_indices = np.where(fn_mask)[0][:5]
    print(f"\n   Example misclassifications:")
    for idx in fn_indices:
        true_label = y_test[idx]
        pred_label = y_pred[idx]
        text_sample = X_text_test[idx][:100] + "..." if len(X_text_test[idx]) > 100 else X_text_test[idx]
        print(f"      True: {LABEL_NAMES[true_label]}, Predicted: {LABEL_NAMES[pred_label]}")
        print(f"      Text: {text_sample}")
else:
    print(f"   ✅ No false negatives! All dementia cases correctly identified.")

# Analyze false positives (healthy predicted as dementia)
print(f"\n🔍 False Positives Analysis (Healthy predicted as Dementia):")
fp_mask = (y_test == 0) & (y_pred != 0)
fp_count = fp_mask.sum()
if fp_count > 0:
    print(f"   Found {fp_count} healthy cases incorrectly predicted as Dementia")
else:
    print(f"   ✅ No false positives!")

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

importances = model.feature_importances_
feature_names = vectorizer.get_feature_names_out()
tfidf_importances = importances[:len(feature_names)]
numeric_importances = importances[len(feature_names):]

# Top TF-IDF terms
top_tfidf_indices = np.argsort(tfidf_importances)[-10:][::-1]
print(f"\n📊 Top 10 TF-IDF Terms:")
for i, idx in enumerate(top_tfidf_indices, 1):
    print(f"   {i:2d}. {feature_names[idx]:20s} - {tfidf_importances[idx]:.6f}")

# Numeric features
print(f"\n📊 Numeric Features Importance:")
numeric_importance_pairs = list(zip(numeric_cols, numeric_importances))
numeric_importance_pairs.sort(key=lambda x: x[1], reverse=True)
for col, imp in numeric_importance_pairs:
    print(f"   {col:30s} - {imp:.6f}")

# ============== SAVE TRAINING REPORT ==============
report_path = os.path.join(MODELS_DIR, "training_report.txt")
with open(report_path, 'w') as f:
    f.write("MODEL TRAINING REPORT\n")
    f.write("=====================\n\n")
    f.write("Best Model: Gradient Boosting (Improved)\n\n")
    f.write("Dataset:\n")
    f.write(f"  Total samples: {len(df)}\n")
    f.write(f"  Training samples: {len(X_train)}\n")
    f.write(f"  Test samples: {len(X_test)}\n")
    f.write("  Class distribution:\n")
    for label, count in label_counts.items():
        f.write(f"    {LABEL_NAMES.get(label, f'Class {label}')}={count}\n")
    f.write("\nModel Performance:\n")
    f.write(f"  Accuracy:  {acc:.4f} ({acc*100:.2f}%)\n")
    f.write(f"  Precision: {prec:.4f}\n")
    f.write(f"  Recall:    {rec:.4f}\n")
    f.write(f"  F1-Score:  {f1:.4f}\n")
    f.write(f"\nConfusion Matrix:\n")
    for i, row in enumerate(cm):
        f.write(f"  {LABEL_NAMES[sorted(LABEL_NAMES.keys())[i]]}: {row}\n")
    f.write(f"\nFalse Negatives (Dementia→Healthy): {fn_count}\n")
    f.write(f"False Positives (Healthy→Dementia): {fp_count}\n")
    f.write(f"\nTraining Date: {pd.Timestamp.now()}\n")
    f.write("Status: IMPROVED - WITH CLASS WEIGHTS\n")

print(f"\n✅ Training report saved: {report_path}")

# ============== SUMMARY ==============
print("\n" + "="*70)
print("✨ RETRAINING COMPLETE!")
print("="*70)
print(f"\n✅ Model improvements:")
print(f"   • Class weights applied to handle imbalance")
print(f"   • Better regularization to prevent overfitting")
print(f"   • Additional dementia-specific features added")
print(f"   • Model accuracy: {acc*100:.2f}%")
print(f"   • False negatives (Dementia→Healthy): {fn_count}")
print(f"   • False positives (Healthy→Dementia): {fp_count}")
print(f"\n🚀 Restart backend to use the improved model")
print("="*70 + "\n")

