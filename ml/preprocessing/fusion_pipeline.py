from preprocessing.audio_pipeline import extract_audio_features
from preprocessing.video_pipeline import extract_emotion_features

def extract_game_features(game_scores: dict) -> list:
    """
    Extract metrics from the cognitive game.
    """
    accuracy = game_scores.get("accuracy", 0.0)
    reaction_time = game_scores.get("reaction_time", 0.0)
    return [accuracy, reaction_time]

def formulate_fusion_vector(transcript: str, emotion_data: dict, game_scores: dict) -> list:
    """
    Combines features from Interview, Game, and Emotion trackers.
    Resulting vector acts as X for the ML model.
    """
    audio_feat = extract_audio_features(transcript)
    emotion_feat = extract_emotion_features(emotion_data)
    game_feat = extract_game_features(game_scores)
    
    fusion_vector = audio_feat + emotion_feat + game_feat
    return fusion_vector
