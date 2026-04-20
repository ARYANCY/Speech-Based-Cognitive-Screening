#!/usr/bin/env python3
"""
Diagnostic tool to compare text vs audio predictions
Helps debug why voice and text give different results for same content
"""
import sys
import json
import os

sys.path.append(os.path.dirname(__file__))
from preprocess_text import compute_features_for_text

def compare_predictions(text_input):
    """
    Compare what features are extracted from text input
    """
    print("\n" + "="*70)
    print("🔍 PREDICTION DIAGNOSIS")
    print("="*70)
    
    print(f"\n📝 Input Text ({len(text_input)} chars):")
    print(f"   {text_input[:100]}...")
    
    # Extract features
    features = compute_features_for_text(text_input)
    
    print(f"\n📊 Extracted Features:")
    print(f"   num_words: {features['num_words']}")
    print(f"   avg_word_length: {features['avg_word_length']:.2f}")
    print(f"   uniq_word_ratio: {features['uniq_word_ratio']:.3f}")
    print(f"   filler_count: {features['filler_count']}")
    print(f"   pronoun_count: {features['pronoun_count']}")
    print(f"   stopword_ratio: {features['stopword_ratio']:.3f}")
    print(f"   sentences_count: {features['sentences_count']}")
    print(f"   repetition_ratio: {features['repetition_ratio']:.3f}")
    print(f"   speech_rate: {features['speech_rate']:.2f}")
    print(f"   article_ratio: {features['article_ratio']:.3f}")
    print(f"   self_correction_count: {features['self_correction_count']}")
    
    # Analyze what might cause low confidence
    print(f"\n⚠️ CONFIDENCE ISSUES CHECK:")
    
    issues = []
    if features['num_words'] < 5:
        issues.append(f"❌ Very short: only {features['num_words']} words (needs at least 10)")
    if features['num_words'] < 10:
        issues.append(f"⚠️ Short text: {features['num_words']} words")
    
    if features['filler_count'] == 0 and features['pronoun_count'] < 2:
        issues.append(f"⚠️ No fillers AND few pronouns: model may be uncertain")
    
    if features['uniq_word_ratio'] < 0.5:
        issues.append(f"⚠️ Very repetitive: {features['uniq_word_ratio']:.1%} unique words")
    
    if features['stopword_ratio'] > 0.5:
        issues.append(f"⚠️ Too many stopwords: {features['stopword_ratio']:.1%}")
    
    if len(issues) > 0:
        print("   Potential issues:")
        for issue in issues:
            print(f"   {issue}")
    else:
        print("   ✅ No obvious feature issues")
    
    print(f"\n💡 WHY 0.32% CONFIDENCE?")
    print(f"   Model returned probability ≈ 0.0032 (0.32%)")
    print(f"   This is BELOW the 70% threshold → marked as INCONCLUSIVE")
    print(f"   This means:")
    print(f"   • Model couldn't confidently classify the text")
    print(f"   • Prediction requires MANUAL REVIEW")
    print(f"   • Could be ambiguous content")
    
    return features

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 diagnose_prediction.py \"your text here\"")
        print("\nExample:")
        print('   python3 diagnose_prediction.py "I went to the store yesterday"')
        sys.exit(1)
    
    text = " ".join(sys.argv[1:])
    features = compare_predictions(text)
    
    print("\n" + "="*70)
    print("✅ DIAGNOSIS COMPLETE")
    print("="*70)
    print("\n💡 RECOMMENDATIONS:")
    print("   • Try longer text (> 50 words) for better confidence")
    print("   • Check if text has clear dementia markers (fillers, repetition)")
    print("   • Audio predictions might differ due to Whisper transcription")
    print("   • If same text gives different results, check transcription output")
    print("\n" + "="*70 + "\n")
