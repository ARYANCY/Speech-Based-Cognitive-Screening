# Infrastructure Setup Guide

This guide describes how to run and orchestrate the local multimodular infrastructure.

## Prerequisites

- Node.js (v18+)
- Python (v3.10+)
- MongoDB Community Server (Running locally on `localhost:27017` or Atlas equivalent)

## 1. Global Setup
Ensure the root `.env` file exists with your application secrets:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/dementia_system
JWT_SECRET=super_secret_jwt_key
VAPI_API_KEY=your_vapi_api_key_here
WHISPER_API_KEY=your_openai_whisper_key_here
MODEL_PATH=../ml/models/
DATA_PATH=../data/
```

## 2. Express Backend

The backend acts as the state manager for the frontend session transitions.

```bash
cd backend
npm install
npm run start
```
Starts on `http://localhost:5000`.

## 3. Python ML Inference Service

This service runs the fused feature arrays against the Random Forest generated model.

```bash
cd ml
# Optional: Setup virtual environment
python -m venv venv
# Windows: source venv/Scripts/activate / Unix: source venv/bin/activate

pip install scikit-learn numpy pandas fastapi uvicorn librosa
```

**Generate Model First:**
```bash
python train.py
```

**Run Server:**
```bash
python inference.py
```
Starts FastAPI on `http://localhost:8000`.

## 4. React Frontend Web Application

The frontend renders the professional assessment interface and flow logic.

```bash
cd frontend
npm install
npm run dev
```
Starts development server (e.g., `http://localhost:5173`).
