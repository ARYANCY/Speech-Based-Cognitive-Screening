# Audio-Only Dementia Detection (Pauses & Prosody)

This pipeline skips transcription and classifies dementia vs healthy directly from the audio signal using pauses, energy, zero-crossing rate, and spectral cues.

## Data Layout
- Place audio in:
  - `data/dementia/` (or `data/dimentia/` typo supported) for dementia-labeled clips
  - `data/healthy/` for healthy clips
- Supported: wav, mp3, ogg, flac, m4a, aac

## Train
```bash
python3 src/retrain_audio_signal.py
```
Outputs:
- `models/audio_classifier.joblib` — logistic regression (class_weight balanced)
- `models/audio_scaler.joblib` — feature scaler
- `models/audio_features.csv` — extracted features for inspection

## Predict (CLI)
```bash
python3 src/predict_audio_signal.py path/to/audio.wav
```
Returns JSON with `prediction`, `label` (0 healthy, 1 dementia), `confidence`, and extracted features.

## API (Backend)
- Endpoint: `POST /predict/audio` (multipart/form-data, field `audio`)
- The backend now calls `src/predict_audio_signal.py` and returns:
  - `prediction`, `label`, `confidence`
  - `features`: pause/prosody feature values
  - `transcription`: null (no transcription used)
- Text endpoint is deprecated (`POST /predict/text` returns 410).

## Feature Set (signal-level)
- Duration, RMS mean/std
- Zero-crossing rate mean/std
- Speech ratio / pause ratio
- Pause count, pause rate/sec, mean/max pause length
- Speech activity per second
- Spectral centroid mean/std

## Notes & Tips
- Performance depends on data size/quality; more labeled dementia audio will improve recall.
- Audio is normalized to mono and scaled; very short clips may yield weak features.
- You can adjust frame/hop in `src/audio_signal_features.py` if needed (defaults: 30 ms frame, 10 ms hop).

