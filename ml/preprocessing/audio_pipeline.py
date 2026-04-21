import librosa
import numpy as np

def extract_audio_features(transcript: str, audio_path: str = None) -> list:
    """
    Extract linguistic and acoustic features.
    In a complete implementation, this might call Whisper for alignment,
    or calculate word frequency, sentiment, and pause durations from audio.
    """
    features = []
    
    # Simple transcript features fallback
    word_count = len(transcript.split()) if transcript else 0
    unique_words = len(set(transcript.split())) if transcript else 0
    type_token_ratio = (unique_words / word_count) if word_count > 0 else 0
    
    features.extend([word_count, type_token_ratio])
    
    # If audio is provided, extract acoustic features
    if audio_path:
        try:
            y, sr = librosa.load(audio_path, sr=None)
            # Example: extract Mean Pitch
            pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
            mean_pitch = np.mean(pitches[magnitudes > np.median(magnitudes)])
            features.append(mean_pitch)
        except Exception as e:
            # Fallback if audio file is not loadable or not provided
            features.append(0.0) 
    else:
        features.append(0.0) 
        
    return features

if __name__ == "__main__":
    # Test logic
    res = extract_audio_features("This is a mock transcript of the interview.", None)
    print("Audio/Transcript features:", res)
