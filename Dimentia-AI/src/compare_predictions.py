#!/usr/bin/env python3
"""
Compare predictions from text vs audio to debug discrepancies
"""
import json
from predict_text import predict as predict_text
from predict_audio import predict as predict_audio

def compare(audio_path, original_text):
    """Compare text and audio predictions"""
    
    print("\n" + "="*70)
    print("🔄 COMPARING TEXT vs AUDIO PREDICTIONS")
    print("="*70)
    
    # Test 1: Original text prediction
    print("\n📝 TEST 1: ORIGINAL WRITTEN TEXT")
    print("-" * 70)
    pred_label, confidence, issues, features, _ = predict_text(original_text)
    
    label_map = {0: "Healthy", 1: "MCI", 2: "Moderate", 3: "Severe"}
    text_pred = label_map.get(pred_label, "Unknown") if pred_label is not None else "Inconclusive"
    
    print(f"Text Input: {original_text[:80]}...")
    print(f"Prediction: {text_pred}")
    print(f"Confidence: {confidence*100:.2f}% if confident else Inconclusive")
    if features:
        print(f"Top Terms: {list(features.get('top_terms', {}).keys())[:5]}")
        print(f"Key Features: filler_count={features.get('numeric_features', {}).get('filler_count')}, "
              f"avg_word_length={features.get('numeric_features', {}).get('avg_word_length')}")
    
    # Test 2: Audio prediction
    print("\n🎙️  TEST 2: AUDIO TRANSCRIPTION & PREDICTION")
    print("-" * 70)
    pred_label_audio, confidence_audio, issues_audio, features_audio, transcription = predict_audio(audio_path)
    
    audio_pred = label_map.get(pred_label_audio, "Unknown") if pred_label_audio is not None else "Inconclusive"
    
    print(f"Transcription: {transcription}")
    print(f"Prediction: {audio_pred}")
    print(f"Confidence: {confidence_audio*100:.2f}% if confident else Inconclusive")
    if features_audio:
        print(f"Top Terms: {list(features_audio.get('top_terms', {}).keys())[:5]}")
        print(f"Key Features: filler_count={features_audio.get('numeric_features', {}).get('filler_count')}, "
              f"avg_word_length={features_audio.get('numeric_features', {}).get('avg_word_length')}")
    
    # Comparison
    print("\n📊 COMPARISON")
    print("-" * 70)
    
    if transcription.strip().lower() == original_text.strip().lower():
        print("✅ TRANSCRIPTION MATCHES ORIGINAL TEXT")
        if text_pred == audio_pred and abs(confidence - confidence_audio) < 0.05:
            print("✅ PREDICTIONS MATCH")
        else:
            print(f"⚠️  PREDICTIONS DIFFER:")
            print(f"   Text: {text_pred} ({confidence*100:.1f}%)")
            print(f"   Audio: {audio_pred} ({confidence_audio*100:.1f}%)")
            print(f"   This could be due to model variance or slight feature differences")
    else:
        print("❌ TRANSCRIPTION DIFFERS FROM ORIGINAL TEXT")
        print(f"\n   Original ({len(original_text)} chars):")
        print(f"   {original_text[:100]}...")
        print(f"\n   Transcribed ({len(transcription)} chars):")
        print(f"   {transcription[:100]}...")
        print(f"\n   💡 LIKELY CAUSE: Whisper model transcribed audio differently")
        print(f"      • Different wording → different features → different prediction")
        print(f"      • This is EXPECTED behavior, not a bug")
    
    print("\n" + "="*70)

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python3 compare_predictions.py <audio_file> <original_text>")
        print("Example: python3 compare_predictions.py audio.wav \"Your text here\"")
        sys.exit(1)
    
    audio_file = sys.argv[1]
    text = " ".join(sys.argv[2:])
    compare(audio_file, text)
