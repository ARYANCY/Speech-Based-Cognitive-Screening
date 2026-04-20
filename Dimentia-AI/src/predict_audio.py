import sys
import os
import re
import json
import warnings
import joblib
import numpy as np
import math
import nltk
from nltk.corpus import stopwords
import whisper
from sklearn.preprocessing import StandardScaler
from scipy.sparse import hstack

warnings.filterwarnings(
    "ignore",
    message="FP16 is not supported on CPU; using FP32 instead",
    category=UserWarning,
    module="whisper"
)

nltk.download("stopwords", quiet=True)
STOPWORDS = set(stopwords.words("english"))

sys.path.append(os.path.dirname(__file__))
from preprocess_text import compute_features_for_text

CONFIDENCE_THRESHOLD = 0.70
TEMPERATURE = 1.2

ROOT = os.path.dirname(os.path.dirname(__file__))
MODELS_DIR = os.path.join(ROOT, "models")
VECTORIZER_PATH = os.path.join(MODELS_DIR, "tfidf_vectorizer.joblib")
SCALER_PATH = os.path.join(MODELS_DIR, "scaler.joblib")
MODEL_PATH = os.path.join(MODELS_DIR, "classifier.joblib")

vectorizer = None
scaler = None
model = None

FEATURE_ORDER = [
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


def load_models():
    global vectorizer, scaler, model
    
    if vectorizer is None or scaler is None or model is None:
        if not all(os.path.exists(p) for p in [VECTORIZER_PATH, SCALER_PATH, MODEL_PATH]):
            raise FileNotFoundError(
                f"Model files not found. Please train the model first.\n"
                f"Expected: {VECTORIZER_PATH}, {SCALER_PATH}, {MODEL_PATH}"
            )
        
        vectorizer = joblib.load(VECTORIZER_PATH)
        scaler = joblib.load(SCALER_PATH)
        model = joblib.load(MODEL_PATH)
    
    return vectorizer, scaler, model


def apply_temperature_scaling(prob, temperature=TEMPERATURE):
    if prob >= 1.0:
        prob = 0.9999
    if prob <= 0.0:
        prob = 0.0001
    
    logit = math.log(prob / (1 - prob))
    scaled_logit = logit / temperature
    scaled_prob = 1 / (1 + math.exp(-scaled_logit))
    
    return scaled_prob


def get_top_features(raw_text, vectorizer, top_n=5):
    tfidf_vector = vectorizer.transform([raw_text])
    feature_names = vectorizer.get_feature_names_out()
    tfidf_array = tfidf_vector.toarray()[0]
    
    top_indices = np.argsort(tfidf_array)[-top_n:][::-1]
    top_terms = {
        feature_names[i]: float(tfidf_array[i])
        for i in top_indices if tfidf_array[i] > 0
    }
    
    numeric_features = compute_features_for_text(raw_text)
    numeric_features_dict = {
        "num_words": int(numeric_features.get("num_words", 0)),
        "avg_word_length": round(float(numeric_features.get("avg_word_length", 0.0)), 2),
        "uniq_word_ratio": round(float(numeric_features.get("uniq_word_ratio", 0.0)), 3),
        "filler_count": int(numeric_features.get("filler_count", 0)),
        "pronoun_count": int(numeric_features.get("pronoun_count", 0)),
        "stopword_ratio": round(float(numeric_features.get("stopword_ratio", 0.0)), 3),
    }
    
    return {
        "top_terms": top_terms,
        "numeric_features": numeric_features_dict,
    }


def predict(audio_path):
    vectorizer, scaler, model = load_models()
    
    validation_issues = []
    
    try:
        whisper_model = whisper.load_model("base", device="cpu")
        result = whisper_model.transcribe(audio_path, fp16=False)
        transcription = result["text"]
    except Exception as e:
        transcription = ""
        validation_issues.append(f"Transcription failed: {str(e)}")
        return "Error", None, validation_issues, None, transcription
    
    if not transcription.strip():
        validation_issues.append("Audio produced empty transcription")
        # No reliable label; mark as low-confidence / inconclusive
        return None, 0.0, validation_issues, None, transcription

    # Short-audio guard: require minimum transcription length (words) to ensure reliable prediction
    try:
        word_count = len([w for w in transcription.split() if w.strip()])
    except Exception:
        word_count = 0

    if word_count < 20:
        validation_issues.append(
            f"Transcription too short: only {word_count} words. "
            "Please read the full paragraph (~50+ words) or provide a longer audio recording."
        )
        # No numeric label for short / unreliable inputs
        return None, 0.0, validation_issues, None, transcription
    
    try:
        numeric_dict = compute_features_for_text(transcription)
        # Extract features in the same order as predict_text.py
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
        numeric_arr = np.array([numeric_dict[c] for c in numeric_cols]).reshape(1, -1)
        
        if numeric_arr.shape[1] != len(FEATURE_ORDER):
            validation_issues.append(
                f"Feature count mismatch: got {numeric_arr.shape[1]}, "
                f"expected {len(FEATURE_ORDER)}"
            )
            return "Error", None, validation_issues, None, transcription
        
        numeric_scaled = scaler.transform(numeric_arr)
        tfidf_features = vectorizer.transform([transcription])
        combined_features = hstack([numeric_scaled, tfidf_features]).toarray()
        
        raw_prediction = model.predict(combined_features)[0]
        raw_probability = model.predict_proba(combined_features)[0]
        
        # Model has 4 classes: [0: Healthy, 1: MCI, 2: Moderate, 3: Severe]
        # Use the maximum probability across all classes
        max_prob = float(np.max(raw_probability))
        prob_calibrated = apply_temperature_scaling(max_prob, TEMPERATURE)
        
        features = get_top_features(transcription, vectorizer, top_n=5)
        
        if prob_calibrated < CONFIDENCE_THRESHOLD:
            # Low confidence: do not emit numeric label
            flag_reason = f"Confidence {prob_calibrated*100:.1f}% below {CONFIDENCE_THRESHOLD*100:.0f}% threshold - please review manually"
            numeric_pred = None
        else:
            numeric_pred = int(raw_prediction)
            flag_reason = None

        # Return numeric label (or None), calibrated confidence, issues, features and transcription
        return numeric_pred, prob_calibrated, validation_issues, features, transcription
        
    except Exception as e:
        validation_issues.append(f"Prediction failed: {str(e)}")
        return "Error", None, validation_issues, None, transcription


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: predict_audio.py <audio_path>"}))
        sys.exit(1)
    
    audio_path = sys.argv[1]
    
    try:
        numeric_label, probability, issues, features, transcription = predict(audio_path)

        # Map numeric label to human-readable text (supporting multi-class)
        LABEL_MAP = {0: "Healthy", 1: "MCI", 2: "Moderate", 3: "Severe"}

        if numeric_label is None:
            prediction_text = "Inconclusive"
            label_value = None
            flag_reason = f"Confidence {probability*100:.1f}% below {CONFIDENCE_THRESHOLD*100:.0f}% threshold - please review manually" if probability is not None else None
        else:
            prediction_text = LABEL_MAP.get(int(numeric_label), "Unknown")
            label_value = int(numeric_label)
            flag_reason = None

        result = {
            "prediction": prediction_text,
            "label": label_value,
            "confidence": probability,
            "flag_reason": flag_reason,
            "transcription": transcription,
            "validation_issues": issues,
            "features": features,
        }

        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            "prediction": "Error",
            "label": None,
            "confidence": None,
            "flag_reason": None,
            "transcription": "",
            "validation_issues": [str(e)],
            "features": None,
        }
        print(json.dumps(error_result))
        sys.exit(1)
