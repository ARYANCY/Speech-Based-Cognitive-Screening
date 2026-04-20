#!/usr/bin/env python3
"""
Transcribe audio using OpenAI Whisper and detect filler words.
"""
import sys
import json
import os
import whisper
import re
from typing import List, Dict, Tuple

# Common filler words to detect
FILLER_WORDS = {
    'um', 'uh', 'uhh', 'uhm', 'umm',
    'ah', 'ahh', 'aah',
    'oh', 'ohh', 'ooh',
    'er', 'err', 'erm',
    'like', 'you know', 'you know what',
    'well', 'so', 'actually', 'basically',
    'hmm', 'hmmm', 'hm'
}

def normalize_text(text: str) -> str:
    """Normalize text for comparison (lowercase, remove punctuation)."""
    return re.sub(r'[^\w\s]', ' ', text.lower()).strip()

def calculate_similarity(transcription: str, expected_text: str) -> float:
    """Calculate word-based similarity between transcription and expected text."""
    if not transcription or not expected_text:
        return 0.0
    
    trans_words = set(normalize_text(transcription).split())
    expected_words = set(normalize_text(expected_text).split())
    
    if not expected_words:
        return 0.0
    
    # Calculate Jaccard similarity (intersection over union)
    intersection = len(trans_words & expected_words)
    union = len(trans_words | expected_words)
    
    if union == 0:
        return 0.0
    
    similarity = intersection / union
    
    # Also check length ratio penalty
    length_ratio = len(trans_words) / len(expected_words) if expected_words else 0
    if length_ratio < 0.5:
        similarity *= 0.5  # Penalize if transcription is too short
    
    return min(1.0, similarity)

def detect_filler_words(transcription: str, segments: List[Dict]) -> Dict:
    """Detect filler words in transcription with timestamps."""
    transcription_lower = transcription.lower()
    filler_words_list = []
    filler_count = 0
    
    # Find filler words in transcription
    for filler in FILLER_WORDS:
        # Use regex to find whole word matches
        pattern = r'\b' + re.escape(filler) + r'\b'
        matches = list(re.finditer(pattern, transcription_lower))
        
        for match in matches:
            filler_count += 1
            start_char = match.start()
            end_char = match.end()
            
            # Find corresponding timestamp from segments
            start_time = 0.0
            end_time = 0.0
            
            # Estimate position in transcription
            char_pos = 0
            for segment in segments:
                segment_text = segment.get('text', '').lower()
                segment_start = segment.get('start', 0.0)
                segment_end = segment.get('end', 0.0)
                
                segment_len = len(segment_text)
                if char_pos <= start_char < char_pos + segment_len:
                    # Found the segment containing this filler word
                    # Estimate time position within segment
                    relative_pos = (start_char - char_pos) / segment_len if segment_len > 0 else 0
                    start_time = segment_start + (segment_end - segment_start) * relative_pos
                    
                    relative_end_pos = (end_char - char_pos) / segment_len if segment_len > 0 else 0
                    end_time = segment_start + (segment_end - segment_start) * relative_end_pos
                    break
                
                char_pos += segment_len + 1  # +1 for space
            
            filler_words_list.append({
                'word': filler,
                'start': round(start_time, 2),
                'end': round(end_time, 2),
                'duration_ms': round((end_time - start_time) * 1000, 0)
            })
    
    # Count total words in transcription
    words = normalize_text(transcription).split()
    total_words = len(words)
    
    return {
        'filler_words': filler_words_list,
        'filler_count': filler_count,
        'filler_words_list': list(set([f['word'] for f in filler_words_list])),
        'total_words': total_words
    }

def transcribe_with_whisper(audio_path: str, model_name: str = 'base') -> Dict:
    """
    Transcribe audio using Whisper and detect filler words.
    
    Args:
        audio_path: Path to audio file
        model_name: Whisper model name (tiny, base, small, medium, large)
    
    Returns:
        Dictionary with transcription, segments, and filler word information
    """
    try:
        # Load Whisper model
        model = whisper.load_model(model_name)
        
        # Transcribe audio
        result = model.transcribe(audio_path, word_timestamps=False)
        
        transcription = result['text'].strip()
        segments = result.get('segments', [])
        
        # Detect filler words
        filler_info = detect_filler_words(transcription, segments)
        
        return {
            'transcription': transcription,
            'segments': segments,
            'language': result.get('language', 'en'),
            **filler_info
        }
    except Exception as e:
        return {
            'error': str(e),
            'transcription': None,
            'filler_words': [],
            'filler_count': 0,
            'filler_words_list': [],
            'total_words': 0
        }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({
            'error': 'Usage: whisper_transcribe.py <audio_path> [model_name] [expected_text]'
        }))
        sys.exit(1)
    
    audio_path = sys.argv[1]
    model_name = sys.argv[2] if len(sys.argv) > 2 else 'base'
    expected_text = sys.argv[3] if len(sys.argv) > 3 else None
    
    if not os.path.exists(audio_path):
        print(json.dumps({
            'error': f'Audio file not found: {audio_path}'
        }))
        sys.exit(1)
    
    result = transcribe_with_whisper(audio_path, model_name)
    
    # Calculate similarity if expected text provided
    if expected_text and result.get('transcription'):
        similarity = calculate_similarity(result['transcription'], expected_text)
        result['text_similarity'] = round(similarity, 4)
        result['similarity_threshold'] = 0.6  # 60% similarity required
        result['is_valid'] = similarity >= 0.6
    else:
        result['text_similarity'] = None
        result['is_valid'] = True  # If no expected text, always valid
    
    print(json.dumps(result, indent=2))

