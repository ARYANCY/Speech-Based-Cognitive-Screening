"""
Simple Vosk helper module for audio transcription and processing.
Provides easy-to-use functions for speech recognition.
"""
import os
import json
import wave
import logging

logger = logging.getLogger(__name__)

try:
    from vosk import Model, KaldiRecognizer
    VOSK_AVAILABLE = True
except ImportError:
    VOSK_AVAILABLE = False
    logger.warning("Vosk not available. Install with: pip install vosk")


class VoskTranscriber:
    """Simple wrapper for Vosk speech recognition."""
    
    def __init__(self, model_path=None):
        """
        Initialize Vosk transcriber.
        
        Args:
            model_path: Path to Vosk model directory. If None, auto-detects.
        """
        self.model = None
        self.model_path = model_path
        self._load_model()
    
    def _load_model(self):
        """Load Vosk model."""
        if not VOSK_AVAILABLE:
            raise ImportError("Vosk is not installed. Install with: pip install vosk")
        
        if self.model_path is None:
            self.model_path = self._find_model()
        
        if not self.model_path or not os.path.exists(self.model_path):
            raise FileNotFoundError(
                f"Vosk model not found at {self.model_path}. "
                "Please download a model from https://alphacephei.com/vosk/models"
            )
        
        try:
            logger.info(f"Loading Vosk model from {self.model_path}")
            self.model = Model(self.model_path)
            logger.info("Vosk model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Vosk model: {e}")
            raise
    
    def _find_model(self):
        """Auto-detect Vosk model in common locations."""
        # Check in backend/vosk_models
        root = os.path.dirname(os.path.dirname(__file__))
        vosk_models_dir = os.path.join(root, "vosk_models")
        
        if os.path.exists(vosk_models_dir):
            for item in os.listdir(vosk_models_dir):
                item_path = os.path.join(vosk_models_dir, item)
                if os.path.isdir(item_path) and "vosk-model" in item.lower():
                    return item_path
        
        return None
    
    def transcribe(self, audio_path, return_words=False):
        """
        Transcribe audio file to text.
        
        Args:
            audio_path: Path to audio file (WAV format, mono, 16kHz recommended)
            return_words: If True, returns word-level timestamps
        
        Returns:
            str: Transcribed text, or dict with words if return_words=True
        """
        if self.model is None:
            raise RuntimeError("Model not loaded. Call _load_model() first.")
        
        try:
            wf = wave.open(audio_path, "rb")
            
            # Check audio format
            if wf.getnchannels() != 1:
                logger.warning("Audio is not mono. Results may be inaccurate.")
            if wf.getcomptype() != "NONE":
                logger.warning("Audio is compressed. Vosk works best with uncompressed WAV.")
            
            # Initialize recognizer
            rec = KaldiRecognizer(self.model, wf.getframerate())
            rec.SetWords(return_words)
            
            # Process audio in chunks
            results = []
            while True:
                data = wf.readframes(4000)
                if len(data) == 0:
                    break
                
                if rec.AcceptWaveform(data):
                    result = json.loads(rec.Result())
                    if 'result' in result:
                        results.extend(result['result'])
            
            # Get final result
            final_result = json.loads(rec.FinalResult())
            if 'result' in final_result:
                results.extend(final_result['result'])
            
            wf.close()
            
            # Extract text
            if return_words:
                return {
                    'text': ' '.join([word['word'] for word in results]),
                    'words': results
                }
            else:
                text = ' '.join([word['word'] for word in results])
                return text.strip()
                
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            raise
    
    def get_segments(self, audio_path):
        """
        Get word-level segments with timestamps.
        
        Args:
            audio_path: Path to audio file
        
        Returns:
            list: List of dicts with 'start', 'end', 'word' keys
        """
        result = self.transcribe(audio_path, return_words=True)
        if isinstance(result, dict) and 'words' in result:
            return result['words']
        return []


def transcribe_audio_simple(audio_path, model_path=None):
    """
    Simple function to transcribe audio using Vosk.
    
    Args:
        audio_path: Path to audio file
        model_path: Optional path to Vosk model
    
    Returns:
        str: Transcribed text
    """
    transcriber = VoskTranscriber(model_path)
    return transcriber.transcribe(audio_path)

