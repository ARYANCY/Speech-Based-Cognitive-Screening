"""
Production-grade audio prediction module for dementia detection.
Handles audio transcription, feature extraction, and ML prediction.
Uses Vosk for offline transcription and librosa for signal analysis.
"""
import sys
import os
import re
import json
import warnings
import io
import logging
import joblib
import numpy as np
import math
import nltk
from nltk.corpus import stopwords
from contextlib import redirect_stderr
from sklearn.preprocessing import StandardScaler
from scipy.sparse import hstack

# MongoDB (optional)
try:
    from pymongo import MongoClient
    PYMONGO_AVAILABLE = True
except ImportError:
    PYMONGO_AVAILABLE = False
    MongoClient = None

# Audio signal processing for direct analysis
try:
    import librosa
    import soundfile as sf
    AUDIO_ANALYSIS_AVAILABLE = True
except ImportError:
    AUDIO_ANALYSIS_AVAILABLE = False
    # Logger not yet defined, will log later

# Vosk helper module for simple audio processing
try:
    from vosk_helper import VoskTranscriber, VOSK_AVAILABLE
except ImportError:
    VOSK_AVAILABLE = False
    VoskTranscriber = None

# Wave module for audio file handling
import wave

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Suppress warnings
warnings.filterwarnings("ignore")

# Download NLTK data if needed
try:
nltk.download("stopwords", quiet=True)
STOPWORDS = set(stopwords.words("english"))
except Exception as e:
    logger.warning(f"Could not load stopwords: {e}")
    STOPWORDS = set()

sys.path.append(os.path.dirname(__file__))
from preprocess_text import compute_features_for_text

# Configuration
CONFIDENCE_THRESHOLD = 0.60  # Lowered to catch more cases, especially dementia
TEMPERATURE = 1.2

# Paths
ROOT = os.path.dirname(os.path.dirname(__file__))
MODELS_DIR = os.path.join(ROOT, "models")
VECTORIZER_PATH = os.path.join(MODELS_DIR, "tfidf_vectorizer.joblib")
SCALER_PATH = os.path.join(MODELS_DIR, "scaler.joblib")
MODEL_PATH = os.path.join(MODELS_DIR, "classifier.joblib")

# Vosk model path configuration
VOSK_MODEL_DIR = os.path.join(ROOT, "vosk_models")
VOSK_MODEL_PATH = None
# Try to find Vosk model
try:
    if os.path.exists(VOSK_MODEL_DIR):
        for item in os.listdir(VOSK_MODEL_DIR):
            item_path = os.path.join(VOSK_MODEL_DIR, item)
            if os.path.isdir(item_path) and "vosk-model" in item.lower():
                VOSK_MODEL_PATH = item_path
                logger.info(f"Found Vosk model at: {VOSK_MODEL_PATH}")
                break
except Exception as e:
    logger.warning(f"Error detecting Vosk model: {e}")

# MongoDB configuration (optional)
MONGODB_URI = os.getenv("MONGODB_URI", "")
mongodb_client = None
mongodb_db = None
if MONGODB_URI and PYMONGO_AVAILABLE and MongoClient:
    try:
        mongodb_client = MongoClient(MONGODB_URI)
        mongodb_db = mongodb_client.get_database()
        logger.info("MongoDB connected successfully")
    except Exception as e:
        logger.warning(f"MongoDB connection failed: {e}")
elif MONGODB_URI and not PYMONGO_AVAILABLE:
    logger.warning("MongoDB URI provided but pymongo not installed. Install with: pip install pymongo")

# Global model cache
vectorizer = None
scaler = None
model = None
vosk_model_cache = None

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
]


def load_models():
    """Load ML models with caching and error handling."""
    global vectorizer, scaler, model
    
    if vectorizer is None or scaler is None or model is None:
        try:
        if not all(os.path.exists(p) for p in [VECTORIZER_PATH, SCALER_PATH, MODEL_PATH]):
                missing = [p for p in [VECTORIZER_PATH, SCALER_PATH, MODEL_PATH] if not os.path.exists(p)]
            raise FileNotFoundError(
                    f"Model files not found: {missing}\n"
                    f"Expected location: {MODELS_DIR}"
            )
        
            logger.info("Loading ML models...")
        vectorizer = joblib.load(VECTORIZER_PATH)
        scaler = joblib.load(SCALER_PATH)
        model = joblib.load(MODEL_PATH)
            logger.info("Models loaded successfully")
        except Exception as e:
            logger.error(f"Error loading models: {e}")
            raise
    
    return vectorizer, scaler, model


def load_vosk_model():
    """Load Vosk model with caching using simple helper."""
    global vosk_model_cache
    
    if vosk_model_cache is None and VOSK_AVAILABLE and VoskTranscriber:
        try:
            logger.info("Loading Vosk model (this may take a moment on first run)...")
            vosk_model_cache = VoskTranscriber(model_path=VOSK_MODEL_PATH)
            logger.info("Vosk model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading Vosk model: {e}")
            raise
    
    return vosk_model_cache
def apply_temperature_scaling(prob, temperature=TEMPERATURE):
    """Apply temperature scaling for calibrated probabilities."""
    if prob is None:
        return None
    
    try:
        prob = np.clip(float(prob), 0.0001, 0.9999)
    logit = math.log(prob / (1 - prob))
    scaled_logit = logit / temperature
    scaled_prob = 1 / (1 + math.exp(-scaled_logit))
        return float(scaled_prob)
    except (ValueError, ZeroDivisionError, OverflowError) as e:
        logger.warning(f"Temperature scaling error: {e}, using original probability")
        return float(prob)


def get_top_features(raw_text, vectorizer, top_n=5):
    """Extract top TF-IDF terms and numeric features with error handling."""
    try:
    tfidf_vector = vectorizer.transform([raw_text])
    feature_names = vectorizer.get_feature_names_out()
    tfidf_array = tfidf_vector.toarray()[0]
    
    top_indices = np.argsort(tfidf_array)[-top_n:][::-1]
    top_terms = {
        feature_names[i]: float(tfidf_array[i])
        for i in top_indices if tfidf_array[i] > 0
    }
    except Exception as e:
        logger.warning(f"Error extracting TF-IDF features: {e}")
        top_terms = {}
    
    try:
    numeric_features = compute_features_for_text(raw_text)
    numeric_features_dict = {
        "num_words": int(numeric_features.get("num_words", 0)),
        "avg_word_length": round(float(numeric_features.get("avg_word_length", 0.0)), 2),
        "uniq_word_ratio": round(float(numeric_features.get("uniq_word_ratio", 0.0)), 3),
        "filler_count": int(numeric_features.get("filler_count", 0)),
        "pronoun_count": int(numeric_features.get("pronoun_count", 0)),
        "stopword_ratio": round(float(numeric_features.get("stopword_ratio", 0.0)), 3),
    }
    except Exception as e:
        logger.warning(f"Error extracting numeric features: {e}")
        numeric_features_dict = {}
    
    return {
        "top_terms": top_terms,
        "numeric_features": numeric_features_dict,
    }


def validate_transcription(transcription):
    """Validate transcription quality and return issues."""
    issues = []
    
    if not transcription or not transcription.strip():
        issues.append("Empty transcription - audio may be silent or unclear")
        return False, issues
    
    words = [w for w in transcription.split() if w.strip()]
    word_count = len(words)
    
    if word_count < MIN_WORDS_FOR_PREDICTION:
        issues.append(
            f"Transcription too short: {word_count} words. "
            f"Minimum {MIN_WORDS_FOR_PREDICTION} words required for reliable prediction. "
            f"Recommended: {MIN_WORDS_FOR_RELIABLE}+ words."
        )
        return False, issues
    
    if word_count < MIN_WORDS_FOR_RELIABLE:
        issues.append(
            f"Transcription length ({word_count} words) is below recommended minimum ({MIN_WORDS_FOR_RELIABLE} words). "
            "Results may be less accurate."
        )
    
    # Check for very repetitive content (potential transcription errors)
    if word_count > 10:
        unique_words = len(set(words))
        uniqueness_ratio = unique_words / word_count
        if uniqueness_ratio < 0.3:
            issues.append(
                f"Low vocabulary diversity ({uniqueness_ratio:.1%}) - transcription may contain errors or be too repetitive"
            )
    
    return True, issues


def analyze_audio_signal(audio_path):
    """
    Direct audio signal analysis to detect:
    - Silence/pauses (gaps)
    - Filler words (uh, umm, ohh) from acoustic features
    - Energy patterns indicating hesitations
    - Speech vs silence segments
    """
    if not AUDIO_ANALYSIS_AVAILABLE:
        return None
    
    try:
        # Load audio file
        y, sr = librosa.load(audio_path, sr=None)
        duration = len(y) / sr
        
        # Calculate energy (RMS) for silence detection
        frame_length = 2048
        hop_length = 512
        rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
        times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop_length)
        
        # Silence threshold (adaptive - use percentile)
        silence_threshold = np.percentile(rms, 20)  # Bottom 20% is considered silence
        
        # Detect silence segments
        silence_mask = rms < silence_threshold
        silence_segments = []
        in_silence = False
        silence_start = 0
        
        for i, is_silent in enumerate(silence_mask):
            if is_silent and not in_silence:
                silence_start = times[i]
                in_silence = True
            elif not is_silent and in_silence:
                silence_end = times[i]
                silence_duration = silence_end - silence_start
                if silence_duration > 0.3:  # Only count pauses > 0.3 seconds
                    silence_segments.append({
                        'start': silence_start,
                        'end': silence_end,
                        'duration': silence_duration
                    })
                in_silence = False
        
        # Handle silence at the end
        if in_silence:
            silence_end = times[-1]
            silence_duration = silence_end - silence_start
            if silence_duration > 0.3:
                silence_segments.append({
                    'start': silence_start,
                    'end': silence_end,
                    'duration': silence_duration
                })
        
        # Calculate pause metrics
        total_silence_time = sum(seg['duration'] for seg in silence_segments)
        num_pauses = len(silence_segments)
        avg_pause_duration = np.mean([seg['duration'] for seg in silence_segments]) if silence_segments else 0
        
        # Detect potential filler words using acoustic features
        # Fillers often have:
        # - Lower energy than normal speech
        # - Shorter duration
        # - Specific spectral characteristics
        
        # Extract spectral features for filler detection
        spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
        zero_crossing_rate = librosa.feature.zero_crossing_rate(y)[0]
        
        # Normalize features
        rms_norm = (rms - np.min(rms)) / (np.max(rms) - np.min(rms) + 1e-10)
        spectral_centroids_norm = (spectral_centroids - np.min(spectral_centroids)) / (np.max(spectral_centroids) - np.min(spectral_centroids) + 1e-10)
        
        # IMPROVED Filler detection heuristic:
        # More accurate detection using multiple acoustic features
        filler_candidates = []
        zcr_percentile_60 = np.percentile(zero_crossing_rate, 60)
        zcr_percentile_70 = np.percentile(zero_crossing_rate, 70)
        
        for i in range(len(rms_norm)):
            # Multiple conditions for filler detection
            is_low_energy = rms_norm[i] < 0.35  # Slightly higher threshold
            is_low_spectral = spectral_centroids_norm[i] < 0.45
            is_high_zcr = zero_crossing_rate[i] > zcr_percentile_60
            
            # Additional check: rapid energy changes (typical of fillers)
            energy_change = 0
            if i > 0 and i < len(rms_norm) - 1:
                energy_change = abs(rms_norm[i+1] - rms_norm[i-1])
            
            # Filler detection: combination of features
            filler_score = 0
            if is_low_energy:
                filler_score += 0.4
            if is_low_spectral:
                filler_score += 0.3
            if is_high_zcr:
                filler_score += 0.2
            if energy_change > 0.15:  # Rapid energy changes
                filler_score += 0.1
            
            # Consider it a filler if score > 0.6
            if filler_score > 0.6:
                filler_candidates.append({
                    'time': times[i],
                    'score': filler_score,
                    'energy': rms_norm[i],
                    'zcr': zero_crossing_rate[i]
                })
        
        # Count distinct filler events (group nearby candidates, improved grouping)
        filler_events = 0
        filler_avg_score = 0
        if filler_candidates:
            # Sort by time
            filler_candidates_sorted = sorted(filler_candidates, key=lambda x: x['time'])
            
            # Group nearby candidates (within 0.3s) as single events
            current_group = [filler_candidates_sorted[0]]
            filler_events = 1
            
            for i in range(1, len(filler_candidates_sorted)):
                time_diff = filler_candidates_sorted[i]['time'] - current_group[-1]['time']
                if time_diff < 0.3:  # Group if within 0.3s
                    current_group.append(filler_candidates_sorted[i])
                else:
                    # New group
                    current_group = [filler_candidates_sorted[i]]
                    filler_events += 1
            
            # Calculate average score
            filler_avg_score = np.mean([f['score'] for f in filler_candidates])
        
        # Calculate speech rate from audio
        # Count speech segments (non-silence)
        speech_segments = []
        in_speech = False
        speech_start = 0
        
        for i, is_silent in enumerate(silence_mask):
            if not is_silent and not in_speech:
                speech_start = times[i]
                in_speech = True
            elif is_silent and in_speech:
                speech_end = times[i]
                speech_segments.append({
                    'start': speech_start,
                    'end': speech_end,
                    'duration': speech_end - speech_start
                })
                in_speech = False
        
        # Handle speech at the end
        if in_speech:
            speech_end = times[-1]
            speech_segments.append({
                'start': speech_start,
                'end': speech_end,
                'duration': speech_end - speech_start
            })
        
        total_speech_time = sum(seg['duration'] for seg in speech_segments)
        num_speech_segments = len(speech_segments)
        
        # Calculate hesitation indicators
        # High pause-to-speech ratio indicates more hesitations
        pause_to_speech_ratio = total_silence_time / total_speech_time if total_speech_time > 0 else 0
        
        return {
            'audio_duration': duration,
            'total_silence_time': round(total_silence_time, 2),
            'total_speech_time': round(total_speech_time, 2),
            'num_pauses': num_pauses,
            'avg_pause_duration': round(avg_pause_duration, 2),
            'pause_ratio': round(total_silence_time / duration, 3) if duration > 0 else 0,
            'num_filler_candidates': filler_events,
            'filler_density': round(filler_events / duration, 2) if duration > 0 else 0,  # Fillers per second
            'filler_detection_score': round(filler_avg_score, 3) if filler_candidates else 0,
            'num_speech_segments': num_speech_segments,
            'pause_to_speech_ratio': round(pause_to_speech_ratio, 3),
            'speaking_efficiency': round((total_speech_time / duration) * 100, 1) if duration > 0 else 0,
            'silence_segments': silence_segments[:10],  # First 10 for reference
        }
        
    except Exception as e:
        logger.warning(f"Audio signal analysis failed: {e}")
        return None


def transcribe_audio(audio_path):
    """Transcribe audio file using Vosk with error handling and time analysis."""
    validation_issues = []
    
    # Verify file exists
    if not os.path.exists(audio_path):
        validation_issues.append(f"Audio file not found: {audio_path}")
        return None, validation_issues, None, None
    
    # Determine audio duration
    audio_duration = None
    try:
        if AUDIO_ANALYSIS_AVAILABLE:
            y, sr = librosa.load(audio_path, sr=None)
            audio_duration = len(y) / sr
        else:
            with wave.open(audio_path, 'rb') as wav_file:
                frames = wav_file.getnframes()
                sample_rate = wav_file.getframerate()
                audio_duration = frames / float(sample_rate)
    except Exception as e:
        logger.warning(f"Could not determine audio duration: {e}")
    
    # Check file size
    try:
        file_size = os.path.getsize(audio_path)
        if file_size == 0:
            validation_issues.append("Audio file is empty")
            return None, validation_issues, None, None
        if file_size > 100 * 1024 * 1024:  # 100MB limit
            validation_issues.append(f"Audio file too large: {file_size / (1024*1024):.1f}MB (max 100MB)")
            return None, validation_issues, None, None
    except Exception as e:
        logger.warning(f"Error checking file size: {e}")
    
    # Transcribe with Vosk
    transcription = ""
    segments = []
    try:
        if not VOSK_AVAILABLE or not VoskTranscriber:
            raise RuntimeError("Vosk is not available. Please install vosk and download a model.")
        vosk_transcriber = load_vosk_model()
        word_segments = vosk_transcriber.get_segments(audio_path)
        segments = word_segments
        transcription = " ".join([w.get('word', '') for w in word_segments]).strip()
    except Exception as e:
        error_msg = f"Vosk transcription failed: {e}"
        validation_issues.append(error_msg)
        logger.error(error_msg)
        return None, validation_issues, None, None
    
    # Calculate time-based metrics
    time_analysis = None
    if audio_duration and audio_duration > 0:
        words = transcription.split()
        num_words = len(words)
        actual_wpm = (num_words / audio_duration) * 60 if audio_duration > 0 else 0
        
        pause_times = []
        speaking_time = 0.0
        if segments:
            for i, segment in enumerate(segments):
                seg_start = segment.get("start", 0)
                seg_end = segment.get("end", 0)
                if seg_end > seg_start:
                    speaking_time += (seg_end - seg_start)
                    if i > 0:
                        prev_end = segments[i-1].get("end", 0)
                        pause_duration = seg_start - prev_end
                        if pause_duration > 0.5:
                            pause_times.append(pause_duration)
        else:
            speaking_time = audio_duration * 0.8
        
        total_pause_time = audio_duration - speaking_time if speaking_time > 0 else 0
        pause_ratio = total_pause_time / audio_duration if audio_duration > 0 else 0
        avg_pause_duration = np.mean(pause_times) if pause_times else 0
        num_pauses = len(pause_times)
        
        time_analysis = {
            "audio_duration": round(audio_duration, 2),
            "speaking_time": round(speaking_time, 2),
            "pause_time": round(total_pause_time, 2),
            "pause_ratio": round(pause_ratio, 3),
            "words_per_minute": round(actual_wpm, 1),
            "num_pauses": num_pauses,
            "avg_pause_duration": round(avg_pause_duration, 2),
            "speaking_efficiency": round((speaking_time / audio_duration) * 100, 1) if audio_duration > 0 else 0,
        }
    
    # Perform direct audio signal analysis (librosa)
    audio_signal_analysis = analyze_audio_signal(audio_path)
    
    logger.info(f"Transcription completed: {len(transcription)} characters")
    if time_analysis:
        logger.info(f"Time analysis: {time_analysis['words_per_minute']:.1f} WPM, {time_analysis['pause_ratio']:.1%} pause ratio")
    if audio_signal_analysis:
        logger.info(f"Audio signal analysis: {audio_signal_analysis['num_pauses']} pauses, {audio_signal_analysis['num_filler_candidates']} filler candidates detected")
    
    return transcription, validation_issues, time_analysis, audio_signal_analysis


def calculate_recall_accuracy(recalled_text, original_text):
    """
    Calculate recall accuracy for memory test.
    Compares recalled text with original text to determine how well the user remembered.
    
    Returns:
        dict: {
            'accuracy': float (0-1),
            'word_match_ratio': float,
            'key_words_recalled': int,
            'total_key_words': int,
            'missing_words': int,
            'extra_words': int,
            'semantic_similarity': float
        }
    """
    if not original_text or not recalled_text:
        return None
    
    # Normalize texts
    def normalize_text(text):
        # Remove punctuation, lowercase, split into words
        import string
        text = text.lower()
        text = text.translate(str.maketrans('', '', string.punctuation))
        return text.split()
    
    original_words = normalize_text(original_text)
    recalled_words = normalize_text(recalled_text)
    
    if len(original_words) == 0:
        return None
    
    # Extract key words (longer words, proper nouns, important words)
    key_words = []
    for word in original_words:
        if len(word) >= 4 or word[0].isupper():
            key_words.append(word.lower())
    
    # Count word matches
    original_set = set(original_words)
    recalled_set = set(recalled_words)
    
    matched_words = original_set.intersection(recalled_set)
    missing_words = original_set - recalled_set
    extra_words = recalled_set - original_set
    
    # Word match ratio
    word_match_ratio = len(matched_words) / len(original_set) if len(original_set) > 0 else 0
    
    # Key words recalled
    key_words_recalled = sum(1 for word in key_words if word in recalled_set)
    total_key_words = len(key_words) if len(key_words) > 0 else 1
    
    # Simple semantic similarity (word overlap)
    semantic_similarity = word_match_ratio
    
    # Overall accuracy (weighted combination)
    # 60% word match, 40% key word recall
    accuracy = (word_match_ratio * 0.6) + ((key_words_recalled / total_key_words) * 0.4)
    
    return {
        'accuracy': round(accuracy, 3),
        'word_match_ratio': round(word_match_ratio, 3),
        'key_words_recalled': key_words_recalled,
        'total_key_words': total_key_words,
        'missing_words': len(missing_words),
        'extra_words': len(extra_words),
        'semantic_similarity': round(semantic_similarity, 3)
    }


def predict(audio_path, original_text=None, hint_text=None):
    """
    Main prediction function with production-grade error handling.
    
    Args:
        audio_path: Path to audio file
        original_text: Optional original text for memory test recall accuracy
        hint_text: Optional hint text (for reference, not used in calculation)
    
    Returns:
        tuple: (numeric_label, confidence, validation_issues, features, transcription)
    """
    validation_issues = []
    
    try:
        # Load models
        vectorizer, scaler, model = load_models()
    except Exception as e:
        logger.error(f"Model loading failed: {e}")
        validation_issues.append(f"Model loading failed: {str(e)}")
        return "Error", None, validation_issues, None, ""
    
    # Transcribe audio
    transcription, trans_issues, time_analysis, audio_signal_analysis = transcribe_audio(audio_path)
    validation_issues.extend(trans_issues)
    
    if transcription is None:
        return "Error", None, validation_issues, None, ""
    
    # Calculate recall accuracy if this is a memory test
    recall_accuracy = None
    if original_text:
        recall_accuracy = calculate_recall_accuracy(transcription, original_text)
        if recall_accuracy:
            logger.info(f"Memory test recall accuracy: {recall_accuracy['accuracy']:.1%} "
                       f"({recall_accuracy['key_words_recalled']}/{recall_accuracy['total_key_words']} key words)")
    
    # Validate transcription quality
    is_valid, valid_issues = validate_transcription(transcription)
    validation_issues.extend(valid_issues)
    
    if not is_valid:
        # Return inconclusive for short/invalid transcriptions
        return None, 0.0, validation_issues, None, transcription
    
    # Extract features and predict
    try:
        numeric_dict = compute_features_for_text(transcription)
        
        # Extract features in correct order
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
        
        # Validate feature extraction
        missing_features = [col for col in numeric_cols if col not in numeric_dict]
        if missing_features:
            validation_issues.append(f"Missing features: {missing_features}")
            logger.warning(f"Missing features: {missing_features}")
            # Fill missing features with defaults
            for col in missing_features:
                numeric_dict[col] = 0.0
        
        numeric_arr = np.array([numeric_dict.get(c, 0.0) for c in numeric_cols]).reshape(1, -1)
        
        if numeric_arr.shape[1] != len(FEATURE_ORDER):
            validation_issues.append(
                f"Feature count mismatch: got {numeric_arr.shape[1]}, expected {len(FEATURE_ORDER)}"
            )
            logger.error(f"Feature count mismatch: {numeric_arr.shape[1]} vs {len(FEATURE_ORDER)}")
            return "Error", None, validation_issues, None, transcription
        
        # Scale features
        numeric_scaled = scaler.transform(numeric_arr)
        
        # Get TF-IDF features
        tfidf_features = vectorizer.transform([transcription])
        
        # Combine features
        combined_features = hstack([numeric_scaled, tfidf_features]).toarray()
        
        # Make prediction
        raw_prediction = model.predict(combined_features)[0]
        raw_probability = model.predict_proba(combined_features)[0]
        
        # Model has 4 classes: [0: Healthy, 1: MCI, 2: Moderate, 3: Severe]
        # Get class probabilities
        class_probs = {
            0: float(raw_probability[0]),  # Healthy
            1: float(raw_probability[1]),  # MCI
            2: float(raw_probability[2]),  # Moderate
            3: float(raw_probability[3]),  # Severe
        }
        
        # Get predicted class
        predicted_class = int(raw_prediction)
        
        # Calculate DEMENTIA PROBABILITY (probability that dementia is present)
        # Dementia probability = P(MCI) + P(Moderate) + P(Severe) = 1 - P(Healthy)
        raw_dementia_prob = class_probs[1] + class_probs[2] + class_probs[3]
        dementia_prob = apply_temperature_scaling(raw_dementia_prob, TEMPERATURE)
        
        # Also keep predicted class probability for internal use
        predicted_class_prob = float(raw_probability[predicted_class])
        prob_calibrated = apply_temperature_scaling(predicted_class_prob, TEMPERATURE)
        
        # Log probabilities for debugging
        logger.info(f"Raw class probabilities: Healthy={class_probs[0]:.2%}, MCI={class_probs[1]:.2%}, Moderate={class_probs[2]:.2%}, Severe={class_probs[3]:.2%}")
        logger.info(f"Predicted class: {predicted_class} ({'Healthy' if predicted_class == 0 else 'Dementia'})")
        logger.info(f"Dementia Probability: {dementia_prob:.2%} (MCI={class_probs[1]:.2%} + Moderate={class_probs[2]:.2%} + Severe={class_probs[3]:.2%})")
        
        # ===== ADVANCED PREDICTION ADJUSTMENT USING AUDIO SIGNAL FEATURES =====
        # Adjust prediction based on audio signal analysis (gaps, fillers, pauses)
        adjusted_class = predicted_class
        adjusted_dementia_prob = dementia_prob  # Start with base dementia probability
        adjustment_reasons = []
        dementia_prob_boost = 0.0  # Initialize dementia probability boost
        
        # Get text features first for comprehensive analysis
        text_features = compute_features_for_text(transcription)
        text_filler_count = text_features.get('filler_count', 0)
        hesitation_density = text_features.get('hesitation_density', 0)
        pause_indicators = text_features.get('pause_indicators', 0)
        repetition_ratio = text_features.get('repetition_ratio', 0)
        
        # Combined dementia score from all sources
        total_dementia_score = 0.0
        
        # ===== AUDIO SIGNAL ANALYSIS =====
        if audio_signal_analysis:
            pause_ratio = audio_signal_analysis.get('pause_ratio', 0)
            filler_density = audio_signal_analysis.get('filler_density', 0)
            num_pauses = audio_signal_analysis.get('num_pauses', 0)
            pause_to_speech = audio_signal_analysis.get('pause_to_speech_ratio', 0)
            avg_pause_duration = audio_signal_analysis.get('avg_pause_duration', 0)
            speaking_efficiency = audio_signal_analysis.get('speaking_efficiency', 100)
            num_filler_candidates = audio_signal_analysis.get('num_filler_candidates', 0)
            
            # MORE AGGRESSIVE thresholds for dementia detection
            # High pause ratio (>20% - lowered threshold) indicates cognitive issues
            if pause_ratio > 0.20:
                score = min(0.20, pause_ratio * 0.8)  # Scale with ratio
                total_dementia_score += score
                adjustment_reasons.append(f"High pause ratio ({pause_ratio:.1%})")
            
            # High filler density (>0.2/sec - lowered threshold) indicates word-finding difficulties
            if filler_density > 0.2:
                score = min(0.25, filler_density * 1.0)  # Scale with density
                total_dementia_score += score
                adjustment_reasons.append(f"High filler density ({filler_density:.2f}/sec)")
            
            # Many pauses (>10 - lowered threshold) indicates fragmented speech
            if num_pauses > 10:
                score = min(0.20, (num_pauses - 10) * 0.01)  # Scale with count
                total_dementia_score += score
                adjustment_reasons.append(f"Many pauses ({num_pauses})")
            
            # High pause-to-speech ratio (>0.3 - lowered threshold) indicates hesitations
            if pause_to_speech > 0.3:
                score = min(0.20, pause_to_speech * 0.5)
                total_dementia_score += score
                adjustment_reasons.append(f"High pause/speech ratio ({pause_to_speech:.2f})")
            
            # Long average pauses (>1.0s - lowered threshold) indicates thinking difficulties
            if avg_pause_duration > 1.0:
                score = min(0.15, (avg_pause_duration - 1.0) * 0.1)
                total_dementia_score += score
                adjustment_reasons.append(f"Long pauses (avg {avg_pause_duration:.1f}s)")
            
            # Low speaking efficiency (<75% - raised threshold) indicates many gaps
            if speaking_efficiency < 75:
                score = min(0.15, (75 - speaking_efficiency) * 0.003)
                total_dementia_score += score
                adjustment_reasons.append(f"Low speaking efficiency ({speaking_efficiency:.1f}%)")
            
            # High number of filler candidates
            if num_filler_candidates > 3:
                score = min(0.15, (num_filler_candidates - 3) * 0.03)
                total_dementia_score += score
                adjustment_reasons.append(f"Multiple filler words detected ({num_filler_candidates})")
        
        # ===== TEXT-BASED FEATURES =====
        # High fillers in text (more aggressive thresholds)
        if text_filler_count > 3:  # Lowered from 5
            score = min(0.20, (text_filler_count - 3) * 0.025)
            total_dementia_score += score
            if text_filler_count > 8:
                adjustment_reasons.append(f"Very high fillers in text ({text_filler_count})")
            else:
                adjustment_reasons.append(f"High fillers in text ({text_filler_count})")
        
        # High hesitation density (lowered threshold)
        if hesitation_density > 0.10:  # Lowered from 0.15
            score = min(0.15, hesitation_density * 1.0)
            total_dementia_score += score
            adjustment_reasons.append(f"High hesitation density ({hesitation_density:.2%})")
        
        # High pause indicators
        if pause_indicators > 5:
            score = min(0.10, (pause_indicators - 5) * 0.01)
            total_dementia_score += score
            adjustment_reasons.append(f"Many pause indicators ({pause_indicators})")
        
        # High repetition ratio (dementia indicator)
        if repetition_ratio > 0.3:
            score = min(0.15, (repetition_ratio - 0.3) * 0.5)
            total_dementia_score += score
            adjustment_reasons.append(f"High repetition ratio ({repetition_ratio:.2%})")
        
        # Cap total score at 1.0
        total_dementia_score = min(total_dementia_score, 1.0)
        
        # ===== DEMENTIA PROBABILITY BOOST CALCULATION =====
        # Calculate dementia probability increase based on gaps and fillers
        # Each gap/filler INCREASES the probability that dementia is present
        
        # Initialize boost variables for calculation breakdown
        pause_boost = 0.0
        filler_boost = 0.0
        ratio_boost = 0.0
        density_boost = 0.0
        text_filler_boost = 0.0
        
        # Boost for each pause/gap detected
        if audio_signal_analysis:
            num_pauses = audio_signal_analysis.get('num_pauses', 0)
            # Each pause increases dementia probability by 1.5% (capped at 20%)
            pause_boost = min(num_pauses * 0.015, 0.20)  # 1.5% per pause, max 20%
            dementia_prob_boost += pause_boost
            
            # Boost for filler words
            num_fillers = audio_signal_analysis.get('num_filler_candidates', 0)
            # Each filler increases dementia probability by 2% (capped at 20%)
            filler_boost = min(num_fillers * 0.02, 0.20)  # 2% per filler, max 20%
            dementia_prob_boost += filler_boost
            
            # Additional boost for high pause ratio
            pause_ratio = audio_signal_analysis.get('pause_ratio', 0)
            if pause_ratio > 0.2:
                ratio_boost = min((pause_ratio - 0.2) * 0.6, 0.15)  # Up to 15% boost
                dementia_prob_boost += ratio_boost
            
            # Additional boost for high filler density
            filler_density = audio_signal_analysis.get('filler_density', 0)
            if filler_density > 0.2:
                density_boost = min((filler_density - 0.2) * 0.4, 0.15)  # Up to 15% boost
                dementia_prob_boost += density_boost
        
        # Boost for text-based fillers
        if text_filler_count > 0:
            # Each text filler increases dementia probability by 1% (capped at 12%)
            text_filler_boost = min(text_filler_count * 0.01, 0.12)
            dementia_prob_boost += text_filler_boost
        
        # Cap total boost at 50% increase (but don't exceed 95% total)
        dementia_prob_boost = min(dementia_prob_boost, 0.50)
        
        # Apply boost to dementia probability
        if dementia_prob_boost > 0:
            adjusted_dementia_prob = min(0.95, adjusted_dementia_prob + dementia_prob_boost)
            num_pauses_val = audio_signal_analysis.get('num_pauses', 0) if audio_signal_analysis else 0
            num_fillers_val = audio_signal_analysis.get('num_filler_candidates', 0) if audio_signal_analysis else 0
            if num_pauses_val > 0 or num_fillers_val > 0:
                adjustment_reasons.append(f"Dementia probability increased by {dementia_prob_boost:.1%} due to {num_pauses_val} pauses and {num_fillers_val} fillers detected")
        
        # ===== PREDICTION ADJUSTMENT LOGIC =====
        # More aggressive adjustment - lower threshold (0.2 instead of 0.3)
        if total_dementia_score > 0.2 and predicted_class == 0:  # If predicted healthy but indicators show issues
            # Determine severity based on combined score
            if total_dementia_score > 0.6:
                adjusted_class = 3  # Severe
                # Apply additional boost on top of existing
                adjusted_dementia_prob = min(0.90, adjusted_dementia_prob + 0.15)
                adjustment_reasons.append("Strong indicators suggest severe dementia")
            elif total_dementia_score > 0.45:
                adjusted_class = 2  # Moderate
                # Apply additional boost on top of existing
                adjusted_dementia_prob = min(0.85, adjusted_dementia_prob + 0.12)
                adjustment_reasons.append("Multiple indicators suggest moderate dementia")
            elif total_dementia_score > 0.3:
                adjusted_class = 1  # MCI
                # Apply additional boost on top of existing
                adjusted_dementia_prob = min(0.80, adjusted_dementia_prob + 0.10)
                adjustment_reasons.append("Indicators suggest mild cognitive impairment")
            else:
                adjusted_class = 1  # MCI (default for any significant score)
                # Apply additional boost on top of existing
                adjusted_dementia_prob = min(0.75, adjusted_dementia_prob + 0.08)
                adjustment_reasons.append("Audio/text analysis suggests cognitive concerns")
            
            logger.warning(f"⚠️ PREDICTION ADJUSTED: {predicted_class} -> {adjusted_class}. Dementia score: {total_dementia_score:.2f}. Original dementia prob: {dementia_prob:.2%}, Adjusted: {adjusted_dementia_prob:.2%}")
        
        # If already predicted dementia, increase probability if audio/text confirms
        elif predicted_class in [1, 2, 3] and total_dementia_score > 0.15:
            # Boost is already applied, add extra confirmation boost
            confirmation_boost = min(total_dementia_score * 0.25, 0.12)
            adjusted_dementia_prob = min(0.95, adjusted_dementia_prob + confirmation_boost)
            adjustment_reasons.append("Audio/text analysis confirms dementia indicators")
            logger.info(f"✅ Audio/text confirms dementia prediction. Dementia probability: {adjusted_dementia_prob:.2%}")
        
        # Special case: Even if score is low but there are SOME indicators, increase probability
        elif total_dementia_score > 0.1 and predicted_class == 0:
            # Boost already applied above, just log
            adjustment_reasons.append("Some indicators detected - dementia probability increased")
            logger.info(f"⚠️ Some dementia indicators detected (score: {total_dementia_score:.2f}). Dementia probability increased to {adjusted_dementia_prob:.2%}.")
        
        # Always apply boost if gaps/fillers detected, even if score is low
        elif dementia_prob_boost > 0 and predicted_class == 0:
            # Boost already applied, just ensure it's logged
            logger.info(f"⚠️ Dementia probability increased by {dementia_prob_boost:.1%} due to gaps and fillers. New probability: {adjusted_dementia_prob:.2%}")
        
        # ===== MEMORY TEST RECALL ACCURACY ADJUSTMENT =====
        # Adjust dementia probability based on recall accuracy
        recall_adjustment = 0.0
        recall_reasons = []
        
        if recall_accuracy:
            accuracy = recall_accuracy['accuracy']
            word_match = recall_accuracy['word_match_ratio']
            key_words_ratio = recall_accuracy['key_words_recalled'] / recall_accuracy['total_key_words'] if recall_accuracy['total_key_words'] > 0 else 0
            
            # Poor recall (<50%) suggests memory issues - increase dementia probability
            if accuracy < 0.50:
                # Very poor recall - significant increase
                recall_adjustment = min(0.25, (0.50 - accuracy) * 0.5)  # Up to 25% increase
                adjusted_dementia_prob = min(0.95, adjusted_dementia_prob + recall_adjustment)
                recall_reasons.append(f"Poor recall accuracy ({accuracy:.1%}) suggests memory impairment")
                logger.warning(f"⚠️ Poor memory recall: {accuracy:.1%} - dementia probability increased by {recall_adjustment:.1%}")
            elif accuracy < 0.70:
                # Moderate recall - moderate increase
                recall_adjustment = min(0.15, (0.70 - accuracy) * 0.5)  # Up to 15% increase
                adjusted_dementia_prob = min(0.95, adjusted_dementia_prob + recall_adjustment)
                recall_reasons.append(f"Moderate recall accuracy ({accuracy:.1%}) may indicate cognitive concerns")
                logger.info(f"⚠️ Moderate memory recall: {accuracy:.1%} - dementia probability increased by {recall_adjustment:.1%}")
            elif accuracy < 0.85:
                # Good but not perfect recall - slight increase
                recall_adjustment = min(0.08, (0.85 - accuracy) * 0.3)  # Up to 8% increase
                adjusted_dementia_prob = min(0.95, adjusted_dementia_prob + recall_adjustment)
                recall_reasons.append(f"Recall accuracy ({accuracy:.1%}) is good but not perfect")
            else:
                # Excellent recall (>85%) - slight decrease (good memory)
                recall_adjustment = -min(0.10, (accuracy - 0.85) * 0.2)  # Up to 10% decrease
                adjusted_dementia_prob = max(0.05, adjusted_dementia_prob + recall_adjustment)
                recall_reasons.append(f"Excellent recall accuracy ({accuracy:.1%}) suggests good memory")
                logger.info(f"✅ Excellent memory recall: {accuracy:.1%} - dementia probability decreased by {abs(recall_adjustment):.1%}")
            
            # Additional adjustment based on key word recall
            if key_words_ratio < 0.50:
                key_word_boost = min(0.10, (0.50 - key_words_ratio) * 0.2)
                adjusted_dementia_prob = min(0.95, adjusted_dementia_prob + key_word_boost)
                recall_reasons.append(f"Low key word recall ({key_words_ratio:.1%}) indicates difficulty remembering important information")
            
            # Add recall reasons to adjustment reasons
            if recall_reasons:
                adjustment_reasons.extend(recall_reasons)
        
        # Calculate detailed breakdown for display
        calculation_breakdown = {
            "base_probability": round(dementia_prob, 4),
            "base_probability_percent": round(dementia_prob * 100, 2),
            "boosts": {
                "pauses": {
                    "count": audio_signal_analysis.get('num_pauses', 0) if audio_signal_analysis else 0,
                    "rate_per_pause": 0.015,
                    "boost": round(pause_boost if audio_signal_analysis else 0, 4),
                    "boost_percent": round((pause_boost if audio_signal_analysis else 0) * 100, 2),
                    "capped_at": 0.20
                },
                "fillers_audio": {
                    "count": audio_signal_analysis.get('num_filler_candidates', 0) if audio_signal_analysis else 0,
                    "rate_per_filler": 0.02,
                    "boost": round(filler_boost if audio_signal_analysis else 0, 4),
                    "boost_percent": round((filler_boost if audio_signal_analysis else 0) * 100, 2),
                    "capped_at": 0.20
                },
                "pause_ratio": {
                    "value": audio_signal_analysis.get('pause_ratio', 0) if audio_signal_analysis else 0,
                    "threshold": 0.2,
                    "boost": round(ratio_boost if audio_signal_analysis else 0, 4),
                    "boost_percent": round((ratio_boost if audio_signal_analysis else 0) * 100, 2),
                    "capped_at": 0.15
                },
                "filler_density": {
                    "value": audio_signal_analysis.get('filler_density', 0) if audio_signal_analysis else 0,
                    "threshold": 0.2,
                    "boost": round(density_boost if audio_signal_analysis else 0, 4),
                    "boost_percent": round((density_boost if audio_signal_analysis else 0) * 100, 2),
                    "capped_at": 0.15
                },
                "fillers_text": {
                    "count": text_filler_count,
                    "rate_per_filler": 0.01,
                    "boost": round(text_filler_boost, 4),
                    "boost_percent": round(text_filler_boost * 100, 2),
                    "capped_at": 0.12
                }
            },
            "total_boost": round(dementia_prob_boost, 4),
            "total_boost_percent": round(dementia_prob_boost * 100, 2),
            "boost_cap": 0.50,
            "final_probability": round(adjusted_dementia_prob, 4),
            "final_probability_percent": round(adjusted_dementia_prob * 100, 2),
            "max_probability": 0.95
        }
        
        # Extract features for display
        features = get_top_features(transcription, vectorizer, top_n=5)
        
        # Add class probabilities to features for transparency
        features["class_probabilities"] = {
            "Healthy": round(class_probs[0] * 100, 1),
            "MCI": round(class_probs[1] * 100, 1),
            "Moderate": round(class_probs[2] * 100, 1),
            "Severe": round(class_probs[3] * 100, 1),
        }
        
        # Add time analysis if available
        if time_analysis:
            features["time_analysis"] = time_analysis
        
        # Add direct audio signal analysis (gaps, fillers from audio)
        if audio_signal_analysis:
            features["audio_signal_analysis"] = {
                "audio_duration": audio_signal_analysis.get("audio_duration", 0),
                "total_silence_time": audio_signal_analysis.get("total_silence_time", 0),
                "total_speech_time": audio_signal_analysis.get("total_speech_time", 0),
                "num_pauses_detected": audio_signal_analysis.get("num_pauses", 0),
                "avg_pause_duration": audio_signal_analysis.get("avg_pause_duration", 0),
                "pause_ratio": audio_signal_analysis.get("pause_ratio", 0),
                "num_filler_candidates": audio_signal_analysis.get("num_filler_candidates", 0),
                "filler_density": audio_signal_analysis.get("filler_density", 0),  # Fillers per second
                "pause_to_speech_ratio": audio_signal_analysis.get("pause_to_speech_ratio", 0),
                "speaking_efficiency": audio_signal_analysis.get("speaking_efficiency", 0),
            }
            logger.info(f"Audio signal analysis: {audio_signal_analysis['num_pauses']} pauses, {audio_signal_analysis['num_filler_candidates']} filler candidates")
        
        # Add text-based time estimates
        if "estimated_speaking_time" in text_features:
            features["text_time_estimates"] = {
                "estimated_speaking_time": round(text_features.get("estimated_speaking_time", 0), 2),
                "estimated_wpm": round(text_features.get("estimated_wpm", 0), 1),
                "hesitation_density": round(text_features.get("hesitation_density", 0), 3),
                "pause_indicators": int(text_features.get("pause_indicators", 0)),
            }
        
        # Add recall accuracy to features if available
        if recall_accuracy:
            features["recall_accuracy"] = recall_accuracy
            features["recall_accuracy"]["recall_adjustment"] = round(recall_adjustment, 4)
            features["recall_accuracy"]["recall_adjustment_percent"] = round(recall_adjustment * 100, 2)
        
        # Add adjustment information (always show if there are reasons, score > 0.1, or probability boost applied)
        if adjustment_reasons or total_dementia_score > 0.1 or dementia_prob_boost > 0 or recall_adjustment != 0:
            features["prediction_adjustment"] = {
                "original_class": int(predicted_class),
                "adjusted_class": int(adjusted_class),
                "original_dementia_prob": round(dementia_prob, 4),
                "adjusted_dementia_prob": round(adjusted_dementia_prob, 4),
                "adjustment_reasons": adjustment_reasons if adjustment_reasons else [],
                "was_adjusted": predicted_class != adjusted_class,
                "dementia_score": round(total_dementia_score, 3),
                "dementia_prob_boost": round(dementia_prob_boost, 4),
                "recall_adjustment": round(recall_adjustment, 4) if recall_accuracy else None,
                "boost_details": {
                    "pauses": audio_signal_analysis.get('num_pauses', 0) if audio_signal_analysis else 0,
                    "fillers": audio_signal_analysis.get('num_filler_candidates', 0) if audio_signal_analysis else 0,
                    "text_fillers": text_filler_count,
                } if (audio_signal_analysis or text_filler_count > 0) else None,
                "calculation_breakdown": calculation_breakdown
            }
        else:
            # Still include calculation breakdown even if no adjustment
            features["calculation_breakdown"] = calculation_breakdown
        
        # Use adjusted values
        final_class = adjusted_class
        final_dementia_prob = adjusted_dementia_prob
        is_dementia_class = final_class in [1, 2, 3]
        
        # Determine if prediction meets threshold based on dementia probability
        # If dementia probability is high (>60%), consider it a valid prediction
        # If dementia probability is low (<40%), might be inconclusive
        dementia_prob_threshold = 0.40  # 40% dementia probability threshold
        
        if final_dementia_prob < dementia_prob_threshold and predicted_class == 0:
            # Low dementia probability and predicted healthy - might be inconclusive if very low
            if final_dementia_prob < 0.20:
                logger.info(f"Low dementia probability: {final_dementia_prob:.2%} < {dementia_prob_threshold:.0%}")
                return None, final_dementia_prob, validation_issues, features, transcription
        else:
            # Valid prediction
            logger.info(f"Final prediction: class={final_class} ({'Dementia' if is_dementia_class else 'Healthy'}), dementia probability={final_dementia_prob:.2%}")
            return final_class, final_dementia_prob, validation_issues, features, transcription
        
    except Exception as e:
        error_msg = f"Prediction failed: {str(e)}"
        validation_issues.append(error_msg)
        logger.error(error_msg, exc_info=True)
        return "Error", None, validation_issues, None, transcription


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: predict_audio.py <audio_path> [--original-text TEXT] [--hint-text TEXT]"}))
        sys.exit(1)
    
    audio_path = sys.argv[1]
    original_text = None
    hint_text = None
    
    # Parse optional arguments
    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == '--original-text' and i + 1 < len(sys.argv):
            original_text = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == '--hint-text' and i + 1 < len(sys.argv):
            hint_text = sys.argv[i + 1]
            i += 2
        else:
            i += 1
    
    try:
        numeric_label, probability, issues, features, transcription = predict(audio_path, original_text, hint_text)

        # Map numeric label to human-readable text
        LABEL_MAP = {0: "Healthy", 1: "MCI", 2: "Moderate", 3: "Severe"}

        # Determine prediction text
        if numeric_label == "Error":
            prediction_text = "Error"
            label_value = None
            flag_reason = None
        elif numeric_label is None:
            prediction_text = "Inconclusive"
            label_value = None
            flag_reason = (
                f"Dementia probability {probability*100:.1f}% below 40% threshold - please review manually"
                if probability is not None else "Unable to determine dementia probability"
            )
        else:
            # Valid prediction
            prediction_text = LABEL_MAP.get(int(numeric_label), "Unknown")
            label_value = int(numeric_label)
            flag_reason = None

        result = {
            "prediction": prediction_text,
            "label": label_value,
            "confidence": round(float(probability), 4) if probability is not None else None,  # Keep for backward compatibility
            "dementia_probability": round(float(probability), 4) if probability is not None else None,  # New field
            "flag_reason": flag_reason,
            "transcription": transcription,
            "validation_issues": issues,
            "features": features,
        }

        print(json.dumps(result))
        
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        error_result = {
            "prediction": "Error",
            "label": None,
            "confidence": None,
            "dementia_probability": None,
            "flag_reason": None,
            "transcription": "",
            "validation_issues": [f"Fatal error: {str(e)}"],
            "features": None,
        }
        print(json.dumps(error_result))
        sys.exit(1)
