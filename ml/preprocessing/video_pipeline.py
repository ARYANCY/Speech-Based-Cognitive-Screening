import os

def extract_emotion_features(emotion_data: dict) -> list:
    """
    Processes DeepFace emotion extraction results.
    The dominant_emotions array, confusion_index and stability_score
    are aggregated to formulate standard features.
    """
    # Initialize basic feature vector
    features = []
    
    dominant_emotions = emotion_data.get('dominant_emotions', [])
    confusion_index = emotion_data.get('confusion_index', 0.0)
    stability_score = emotion_data.get('stability_score', 0.0)
    
    # Example: Frequency of a specific emotion like confusion/sadness vs happiness
    negativity_ratio = 0.0
    if len(dominant_emotions) > 0:
        negative_emotions = [e for e in dominant_emotions if e in ['sad', 'fear', 'angry', 'neutral']]
        negativity_ratio = len(negative_emotions) / len(dominant_emotions)
        
    features.extend([confusion_index, stability_score, negativity_ratio])
    return features
