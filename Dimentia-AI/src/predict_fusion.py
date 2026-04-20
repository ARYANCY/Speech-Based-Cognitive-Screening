#!/usr/bin/env python3
"""
Simple rule-based multimodal fusion prototype.

Usage (CLI):
  python3 src/predict_fusion.py --text "..." --audio /path/to/file.wav

This script calls the existing `predict_text.predict` and `predict_audio.predict` functions
and applies simple fusion rules to produce a final recommendation.
"""
import argparse
import json
import sys
import os

sys.path.append(os.path.dirname(__file__))
from predict_text import predict as predict_text
from predict_audio import predict as predict_audio

LABEL_MAP = {0: "Healthy", 1: "MCI", 2: "Moderate", 3: "Severe"}


def fuse(text, audio_path=None, weights=(0.6, 0.4)):
    # Run text prediction
    text_pred, text_conf, text_issues, text_features = predict_text(text)

    # Run audio prediction if provided
    if audio_path:
        audio_pred, audio_conf, audio_issues, audio_features, transcription = predict_audio(audio_path)
    else:
        audio_pred = None
        audio_conf = None
        audio_issues = []
        audio_features = None
        transcription = None

    # Convert None confidences to 0 for fusion math
    tc = float(text_conf) if text_conf is not None else 0.0
    ac = float(audio_conf) if audio_conf is not None else 0.0

    # If both agree and both confident -> accept
    if text_pred is not None and audio_pred is not None and text_pred == audio_pred and tc >= 0.7 and ac >= 0.7:
        return {
            'final_label': LABEL_MAP.get(int(text_pred)),
            'final_numeric': int(text_pred),
            'fused_confidence': max(tc, ac),
            'status': 'accepted',
            'text': {'label': LABEL_MAP.get(text_pred), 'confidence': tc},
            'audio': {'label': LABEL_MAP.get(audio_pred) if audio_pred is not None else None, 'confidence': ac},
        }

    # If one has high confidence (>0.8) and the other is low/unset, accept high-confidence modality
    if tc >= 0.8 and (ac < 0.7 or audio_pred is None):
        return {
            'final_label': LABEL_MAP.get(text_pred) if text_pred is not None else None,
            'final_numeric': int(text_pred) if text_pred is not None else None,
            'fused_confidence': tc,
            'status': 'accepted_but_flagged',
            'text': {'label': LABEL_MAP.get(text_pred), 'confidence': tc},
            'audio': {'label': LABEL_MAP.get(audio_pred) if audio_pred is not None else None, 'confidence': ac},
        }

    if ac >= 0.8 and (tc < 0.7 or text_pred is None):
        return {
            'final_label': LABEL_MAP.get(audio_pred) if audio_pred is not None else None,
            'final_numeric': int(audio_pred) if audio_pred is not None else None,
            'fused_confidence': ac,
            'status': 'accepted_but_flagged',
            'text': {'label': LABEL_MAP.get(text_pred) if text_pred is not None else None, 'confidence': tc},
            'audio': {'label': LABEL_MAP.get(audio_pred), 'confidence': ac},
        }

    # Weighted fusion fallback
    # Represent each prediction as numeric class probability for simplicity we use confidence toward chosen label
    # Compute pseudo fused_confidence = weighted max of modality confidences
    fused_conf = weights[0] * tc + weights[1] * ac

    # If fused_conf high enough -> pick modality with higher confidence
    if fused_conf >= 0.75:
        chosen = text_pred if tc >= ac else audio_pred
        return {
            'final_label': LABEL_MAP.get(chosen) if chosen is not None else None,
            'final_numeric': int(chosen) if chosen is not None else None,
            'fused_confidence': fused_conf,
            'status': 'accepted_by_fusion',
            'text': {'label': LABEL_MAP.get(text_pred) if text_pred is not None else None, 'confidence': tc},
            'audio': {'label': LABEL_MAP.get(audio_pred) if audio_pred is not None else None, 'confidence': ac},
        }

    # Otherwise inconclusive
    return {
        'final_label': None,
        'final_numeric': None,
        'fused_confidence': fused_conf,
        'status': 'inconclusive',
        'text': {'label': LABEL_MAP.get(text_pred) if text_pred is not None else None, 'confidence': tc},
        'audio': {'label': LABEL_MAP.get(audio_pred) if audio_pred is not None else None, 'confidence': ac},
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--text', type=str, required=True, help='Text input')
    parser.add_argument('--audio', type=str, required=False, help='Path to audio file')
    args = parser.parse_args()

    out = fuse(args.text, args.audio)
    print(json.dumps(out, indent=2))


if __name__ == '__main__':
    main()
