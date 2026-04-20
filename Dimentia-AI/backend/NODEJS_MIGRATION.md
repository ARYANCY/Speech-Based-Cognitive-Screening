# Node.js Backend Migration

The backend has been migrated to use Node.js modules instead of calling Python scripts directly. This improves performance and reduces process overhead.

## Architecture

### Node.js Modules (Pure JavaScript)
- **`lib/audioFeatures.js`**: Audio feature extraction (RMS, ZCR, pause detection, spectral centroid)
- **`lib/audioPredictor.js`**: Main prediction orchestrator

### Python Bridges (Minimal)
- **`lib/mlPredictor.js`**: Calls Python to load scikit-learn models (joblib format)

## Key Changes

1. **Audio Processing**: Now handled entirely in Node.js using `fluent-ffmpeg` and custom signal processing
2. **Feature Extraction**: Implemented in JavaScript (no Python dependency)
3. **ML Models**: Still use Python bridge for scikit-learn models (joblib format requires Python)

## Dependencies

New Node.js packages:
- `fluent-ffmpeg`: Audio processing and conversion
- `ffmpeg-static`: Static FFmpeg binary
- `ml-matrix`: Matrix operations for signal processing
- `wav`: WAV file parsing
- `python-shell`: Python bridge (for ML models)

## Benefits

1. **Faster**: No process spawning overhead for audio feature extraction
2. **More Reliable**: Better error handling and resource management
3. **Easier Debugging**: JavaScript stack traces instead of Python subprocess errors
4. **Better Integration**: Native Node.js modules integrate seamlessly

## Remaining Python Dependencies

- **Scikit-learn Models**: Joblib format requires Python to load

This is handled via a lightweight Python bridge that only spawns processes when needed.

## Testing

To test the new implementation:

```bash
cd backend
npm start
```

Then test with an audio file via the frontend or API.

## Future Improvements

1. Convert scikit-learn models to ONNX or TensorFlow.js format
2. Optimize FFT implementation for large audio files

