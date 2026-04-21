# System Architecture

## Modality Breakdown

The system relies on three parallel feature extractors culminating in a singular inference step.

1. **Voice / Linguistic Processing**
   - **Service:** Vapi (Interaction) + Whisper (STT) + Custom Python Lexical parser.
   - **Extracted Features:** Word count, Type-token ratio, Mean vocal pitch.
   - **Pipeline:** `audio_pipeline.py`

2. **Visual/Facial Tracking**
   - **Service:** DeepFace (Local Python invocation or wrapper).
   - **Extracted Features:** Emotional confusion index, stability score, negative emotion ratios.
   - **Pipeline:** `video_pipeline.py`

3. **Cognitive Game Mechanism**
   - **Service:** Built-in React Spatial logic game.
   - **Extracted Features:** True reaction time, sequence memory accuracy.

## Database Schema (MongoDB `Session`)

Every patient run creates a unique `Session` Document. The document is incrementally updated.

```json
{
  "session_id": "String (Unique ID)",
  "user_id": "String",
  "timestamp": "Date",
  "interview": { "audio_path": "String", "transcript": "String", "features": "Object" },
  "game": { "scores": "Object", "raw_logs": "Object" },
  "emotion": { "dominant_emotions": ["String"], "confusion_index": "Number" },
  "prediction": { "risk_score": "Number", "label": "String" }
}
```

## Inference Engine Rules

> [!IMPORTANT] 
> The ML model (FastAPI) is strictly triggered only on `/session/:id/complete`. Partial data results in a rejection from the backend to ensure data integrity during clinical review.

The Python FastAPI server accepts the fused data block, processes it via `formulate_fusion_vector`, and passes it through an offline `RandomForestClassifier` (saved as a `.pkl` mapping).
