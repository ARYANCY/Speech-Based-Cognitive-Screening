# src/predict_text.py
import os, sys, json
sys.path.append(os.path.dirname(__file__))

import joblib
import numpy as np
import math
from scipy.sparse import hstack
from preprocess_text import clean_text, compute_features_for_text

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")

# Configuration for improved accuracy
CONFIDENCE_THRESHOLD = 0.60  # Lowered to catch more cases, especially dementia
TEMPERATURE = 1.2

def load_artifacts():
    vect = joblib.load(os.path.join(MODELS_DIR, "tfidf_vectorizer.joblib"))
    scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.joblib"))
    clf = joblib.load(os.path.join(MODELS_DIR, "classifier.joblib"))
    return vect, scaler, clf

def get_top_features(raw_text, vect, top_n=5):
    """Extract top TF-IDF terms and numeric features."""
    features_info = {'top_terms': {}, 'numeric_features': {}}
    
    try:
        text_vec = vect.transform([raw_text])
        feature_names = vect.get_feature_names_out()
        arr = text_vec.toarray()[0]
        nz = np.where(arr > 0)[0]
        if len(nz) > 0:
            top_indices = np.argsort(arr[nz])[-top_n:][::-1]
            top_terms = [(feature_names[nz[i]], float(arr[nz[i]])) for i in top_indices]
            features_info['top_terms'] = {t[0]: round(t[1], 4) for t in top_terms}
    except Exception as e:
        features_info['top_terms_error'] = str(e)
    
    try:
        numeric_dict = compute_features_for_text(raw_text)
        features_info['numeric_features'] = {
            'filler_count': int(numeric_dict.get('filler_count', 0)),
            'pronoun_count': int(numeric_dict.get('pronoun_count', 0)),
            'num_words': int(numeric_dict.get('num_words', 0)),
            'avg_word_length': round(float(numeric_dict.get('avg_word_length', 0.0)), 2),
            'stopword_ratio': round(float(numeric_dict.get('stopword_ratio', 0.0)), 3),
            'uniq_word_ratio': round(float(numeric_dict.get('uniq_word_ratio', 0.0)), 3)
        }
        
        # Add time analysis features
        features_info['time_analysis'] = {
            'estimated_speaking_time': round(numeric_dict.get('estimated_speaking_time', 0), 2),
            'estimated_wpm': round(numeric_dict.get('estimated_wpm', 0), 1),
            'hesitation_density': round(numeric_dict.get('hesitation_density', 0), 3),
            'pause_indicators': int(numeric_dict.get('pause_indicators', 0)),
        }
    except Exception as e:
        features_info['numeric_error'] = str(e)
    
    return features_info

def apply_temperature_scaling(prob):
    """Apply temperature scaling for calibrated probabilities."""
    try:
        prob = np.clip(prob, 0.001, 0.999)
        log_odds = math.log(prob / (1 - prob)) / TEMPERATURE
        scaled_prob = 1 / (1 + math.exp(-log_odds))
        return float(scaled_prob)
    except Exception:
        return float(prob)

def validate_input(raw_text):
    """Validate input text for minimum quality"""
    cleaned = clean_text(raw_text)
    words = cleaned.split()
    issues = []
    if len(words) < 3:
        issues.append(f"Too short: only {len(words)} word(s), need at least 3")
    if len(cleaned) < 10:
        issues.append(f"Text too brief: {len(cleaned)} characters, need at least 10")
    return len(issues) == 0, issues

def prepare_X(raw_text, vect, scaler):
    numeric_dict = compute_features_for_text(raw_text)
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
        "self_correction_count"
    ]
    numeric_arr = np.array([numeric_dict[c] for c in numeric_cols]).reshape(1, -1)
    text_vec = vect.transform([raw_text])
    numeric_scaled = scaler.transform(numeric_arr)
    X = hstack([text_vec, numeric_scaled])
    return X

def predict(raw_text):
    """Predict dementia from text with validation and explanations"""
    is_valid, issues = validate_input(raw_text)
    if not is_valid:
        return None, None, issues, {}
    # Short-input guard: if input is very short, avoid running full model
    numeric_check = compute_features_for_text(raw_text)
    num_words = int(numeric_check.get('num_words', 0))
    if num_words < 6:
        # Return explicit low-confidence result and a helpful issue message
        vect, _, _ = load_artifacts()
        features = get_top_features(raw_text, vect)
        issues = issues + [f"Too short: only {num_words} words. Provide a longer text or an audio sample for reliable prediction."]
        # Return None label and 0.0 confidence so caller marks it Inconclusive
        return None, 0.0, issues, features

    vect, scaler, clf = load_artifacts()
    X = prepare_X(raw_text, vect, scaler)

    try:
        probs = clf.predict_proba(X)[0]
        # Model has 4 classes: [0: Healthy, 1: MCI, 2: Moderate, 3: Severe]
    except Exception:
        probs = None

    pred = int(clf.predict(X)[0])

    # Use the probability of the PREDICTED class (not max across all classes)
    # This gives us the actual confidence in the prediction
    if probs is not None:
        predicted_class_prob = float(probs[pred])
        prob_calibrated = apply_temperature_scaling(predicted_class_prob)
    else:
        prob_calibrated = None

    features = get_top_features(raw_text, vect)
    
    # Add class probabilities for transparency
    try:
        if probs is not None:
            features['class_probabilities'] = {
                'Healthy': round(float(probs[0]) * 100, 1),
                'MCI': round(float(probs[1]) * 100, 1),
                'Moderate': round(float(probs[2]) * 100, 1),
                'Severe': round(float(probs[3]) * 100, 1),
            }
    except Exception:
        pass  # If probabilities unavailable, skip
    
    return pred, prob_calibrated, [], features

if __name__ == "__main__":
    if len(sys.argv) >= 2:
        raw = " ".join(sys.argv[1:])
        pred, prob, validation_issues, features = predict(raw)
        # Map numeric labels to human-readable classes (handles multi-class labels)
        LABEL_MAP = {0: "Healthy", 1: "MCI", 2: "Moderate", 3: "Severe"}

        # Use calibrated probability (prob) which is the predicted class probability
        confidence = prob

        # For dementia classes (1, 2, 3), use a lower threshold to catch potential cases
        is_dementia_class = pred is not None and int(pred) in [1, 2, 3]
        effective_threshold = CONFIDENCE_THRESHOLD * 0.75 if is_dementia_class else CONFIDENCE_THRESHOLD

        if confidence is not None and confidence < effective_threshold:
            prediction_label = "Inconclusive"
            label = None
            flag_reason = f"Confidence {confidence:.1%} below {effective_threshold:.0%} threshold - please review manually"
        else:
            prediction_label = LABEL_MAP.get(int(pred), "Unknown") if pred is not None else "Unknown"
            label = int(pred) if pred is not None else None
            flag_reason = None
        
        result = {
            "prediction": prediction_label,
            "label": label,
            "confidence": round(float(confidence), 4) if confidence is not None else None,
            "flag_reason": flag_reason,
            "validation_issues": validation_issues,
            "features": features
        }
        print(json.dumps(result))
    else:
        error_result = {
            "error": "Usage: python3 src/predict_text.py \"your transcript here\"",
            "validation_issues": []
        }
        print(json.dumps(error_result))
        sys.exit(1)
