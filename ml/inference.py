import os
import pickle
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from preprocessing.fusion_pipeline import formulate_fusion_vector

app = FastAPI(title="Dementia Inference Service")

# Load model globally on startup
MODEL_PATH = os.path.join('models', 'rf_dementia_model.pkl')
model = None

@app.on_event("startup")
def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)
        print("Model loaded successfully.")
    else:
        print("Warning: Model not found. Please run train.py to generate it.")

class SessionData(BaseModel):
    session_id: str
    interview_transcript: str
    game_scores: dict
    emotion_data: dict

@app.post("/predict")
def predict_risk(data: SessionData):
    if not model:
        raise HTTPException(status_code=500, detail="Model is not loaded.")
        
    try:
        # 1. Feature extraction using pipeline
        features = formulate_fusion_vector(
            transcript=data.interview_transcript,
            emotion_data=data.emotion_data,
            game_scores=data.game_scores
        )
        
        # 2. Reshape and predict
        X_test = np.array([features])
        prediction_label = model.predict(X_test)[0]
        prediction_proba = model.predict_proba(X_test)[0][1] # Probability of Class 1 (Risk)
        
        # 3. Format response
        result = {
            "risk_score": float(prediction_proba),
            "label": "High Risk" if prediction_label == 1 else "Low Risk",
            "features_extracted": features
        }
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("inference:app", host="0.0.0.0", port=8000, reload=True)
