# 🧠 Dementia Detection Backend

Express.js backend server with Python ML scripts for dementia detection using speech pattern analysis.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [File Structure](#file-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Dependencies](#dependencies)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Python Scripts](#python-scripts)
- [ML Models](#ml-models)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The backend consists of:
- **Express.js Server** (`server.js`): REST API endpoints for text and audio prediction
- **Python ML Scripts**: Audio transcription, feature extraction, and ML prediction
- **ML Models**: Pre-trained models for dementia classification

### Key Features
- Audio transcription using Gemini API
- Audio signal processing using Vosk
- Text feature extraction and analysis
- ML-based dementia probability prediction
- Memory test recall accuracy calculation
- MongoDB integration for data storage

---

## 🏗️ Architecture

```
┌─────────────────┐
│  Express.js     │  ← REST API Server (Port 5000)
│  (Node.js)      │
└────────┬────────┘
         │
         ├──► Python ML Scripts
         │    ├── predict_audio.py (Gemini + Vosk + ML)
         │    ├── predict_text.py (ML only)
         │    └── preprocess_text.py (Feature extraction)
         │
         ├──► Gemini API (Transcription)
         │
         ├──► Vosk (Audio Processing)
         │
         ├──► ML Models
         │    ├── classifier.joblib
         │    ├── tfidf_vectorizer.joblib
         │    └── scaler.joblib
         │
         └──► MongoDB (Data Storage)
```

---

## 📁 File Structure

```
backend/
├── README.md                    # This file
├── package.json                 # Node.js dependencies
├── requirements.txt             # Python dependencies
├── server.js                    # Express.js API server
├── render.yaml                  # Deployment configuration
│
├── src/                         # Python ML Scripts
│   ├── predict_audio.py        # Audio prediction (Gemini + Vosk + ML)
│   ├── predict_text.py         # Text-only prediction
│   ├── preprocess_text.py      # Feature extraction
│   └── generate_research_dataset.py  # Dataset generation
│
├── models/                      # Trained ML Models
│   ├── classifier.joblib        # Main classification model
│   ├── tfidf_vectorizer.joblib # TF-IDF vectorizer
│   ├── scaler.joblib           # Feature scaler
│   └── training_report.txt     # Model training report
│
├── uploads/                     # Temporary audio file storage
│
└── transcripts/                 # Training data
    ├── transcripts.csv          # Raw transcripts
    └── processed_data.csv       # Processed features
```

---

## 📦 Prerequisites

### Required Software
- **Node.js** 14+ ([Download](https://nodejs.org/))
- **Python** 3.7+ ([Download](https://www.python.org/))
- **MongoDB** (Cloud or local instance)
- **Git** (for cloning repository)

### API Keys Required
- **Gemini API Keys**: Multiple keys for transcription (comma-separated)
- **MongoDB URI**: Connection string for database

---

## 🚀 Installation

### 1. Install Node.js Dependencies

```bash
cd backend
npm install
```

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

Or using Python 3:

```bash
python3 -m pip install -r requirements.txt
```

### 3. Download Vosk Model

Download a Vosk model for your language (English recommended):

```bash
# Create models directory
mkdir -p vosk_models

# Download English model (small, ~50MB)
cd vosk_models
wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
unzip vosk-model-small-en-us-0.15.zip
cd ..
```

For better accuracy, use the larger model:
```bash
wget https://alphacephei.com/vosk/models/vosk-model-en-us-0.22.zip
unzip vosk-model-en-us-0.22.zip
```

### 4. Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
GEMINI_API_KEYS=your_key1,your_key2,your_key3
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

**Note**: Multiple Gemini API keys can be provided (comma-separated) for load balancing and rate limit handling.

### 5. Verify ML Models

Ensure the following model files exist in `backend/models/`:
- `classifier.joblib`
- `tfidf_vectorizer.joblib`
- `scaler.joblib`

---

## 📚 Dependencies

### Node.js Dependencies (`package.json`)

```json
{
  "dependencies": {
    "express": "^4.18.2",      // Web framework
    "cors": "^2.8.5",          // CORS middleware
    "dotenv": "^16.3.1",       // Environment variables
    "axios": "^1.6.2",         // HTTP client
    "multer": "^1.4.5-lts.1",  // File upload handling
    "uuid": "^9.0.1"           // UUID generation
  },
  "devDependencies": {
    "nodemon": "^3.0.2"        // Development server auto-reload
  }
}
```

### Python Dependencies (`requirements.txt`)

```
google-generativeai    # Gemini API for transcription
vosk                  # Offline speech recognition
pymongo               # MongoDB driver
soundfile             # Audio file I/O
pandas                # Data manipulation
numpy                 # Numerical computing
scipy                 # Scientific computing
scikit-learn          # Machine learning
joblib                # Model serialization
nltk                  # Natural language processing
librosa               # Audio analysis
pydub                 # Audio manipulation
```

**Install all Python dependencies:**
```bash
pip install -r requirements.txt
```

---

## ⚙️ Configuration

### Environment Variables (`.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `GEMINI_API_KEYS` | Comma-separated Gemini API keys | `key1,key2,key3` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |

### Vosk Model Configuration

Edit `predict_audio.py` to set the Vosk model path:

```python
VOSK_MODEL_PATH = os.path.join(ROOT, "vosk_models", "vosk-model-small-en-us-0.15")
```

---

## 🔌 API Endpoints

### Health Check
```
GET /health
```
Returns server status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Text Prediction
```
POST /predict/text
Content-Type: application/json

{
  "text": "User's text input here..."
}
```

**Response:**
```json
{
  "prediction": "Healthy|MCI|Moderate|Severe",
  "label": 0|1|2|3,
  "confidence": 0.85,
  "dementia_probability": 0.15,
  "validation_issues": [],
  "features": { ... }
}
```

### Audio Prediction
```
POST /predict/audio
Content-Type: multipart/form-data

Form Data:
- audio: (file) Audio file (mp3, wav, ogg, etc.)
- original_text: (optional) Original text for memory test
- hint_text: (optional) Hint text for memory test
```

**Response:**
```json
{
  "prediction": "Healthy|MCI|Moderate|Severe",
  "label": 0|1|2|3,
  "confidence": 0.85,
  "dementia_probability": 0.15,
  "transcription": "Transcribed text...",
  "validation_issues": [],
  "features": {
    "class_probabilities": { ... },
    "time_analysis": { ... },
    "audio_signal_analysis": { ... },
    "recall_accuracy": { ... },
    "calculation_breakdown": { ... }
  }
}
```

---

## 🐍 Python Scripts

### `predict_audio.py`
Main audio prediction script. Handles:
- Audio transcription using Gemini API
- Audio signal processing using Vosk
- Feature extraction
- ML prediction
- Memory test recall accuracy

**Usage:**
```bash
python src/predict_audio.py <audio_path> [--original-text TEXT] [--hint-text TEXT]
```

### `predict_text.py`
Text-only prediction script. Handles:
- Text feature extraction
- ML prediction

**Usage:**
```bash
python src/predict_text.py "Text to analyze"
```

### `preprocess_text.py`
Text preprocessing and feature extraction module.

**Features extracted:**
- Word count, average word length
- Unique word ratio
- Filler word count
- Pronoun count
- Stopword ratio
- Sentence count
- Repetition ratio
- Speech rate
- Article ratio
- Self-correction count

---

## 🤖 ML Models

### Model Files
- **`classifier.joblib`**: Main Random Forest classifier
  - Classes: 0=Healthy, 1=MCI, 2=Moderate, 3=Severe
- **`tfidf_vectorizer.joblib`**: TF-IDF vectorizer for text features
- **`scaler.joblib`**: StandardScaler for feature normalization

### Model Performance
Check `models/training_report.txt` for detailed metrics.

---

## 💻 Usage

### Start Development Server

```bash
npm run dev
```

Uses `nodemon` for auto-reload on file changes.

### Start Production Server

```bash
npm start
```

Or directly:
```bash
node server.js
```

### Test Endpoints

**Health Check:**
```bash
curl http://localhost:5000/health
```

**Text Prediction:**
```bash
curl -X POST http://localhost:5000/predict/text \
  -H "Content-Type: application/json" \
  -d '{"text": "This is a test sentence for dementia detection."}'
```

**Audio Prediction:**
```bash
curl -X POST http://localhost:5000/predict/audio \
  -F "audio=@path/to/audio.wav"
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Python Script Errors
**Error:** `ModuleNotFoundError: No module named 'vosk'`
**Solution:** Install Python dependencies:
```bash
pip install -r requirements.txt
```

#### 2. Vosk Model Not Found
**Error:** `Model not found`
**Solution:** Download Vosk model and update path in `predict_audio.py`:
```bash
mkdir -p vosk_models
cd vosk_models
wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
unzip vosk-model-small-en-us-0.15.zip
```

#### 3. Gemini API Errors
**Error:** `API key invalid` or `Rate limit exceeded`
**Solution:** 
- Verify API keys in `.env` file
- Use multiple API keys (comma-separated) for load balancing
- Check API quota limits

#### 4. MongoDB Connection Errors
**Error:** `MongoDB connection failed`
**Solution:**
- Verify `MONGODB_URI` in `.env`
- Check network connectivity
- Verify MongoDB credentials

#### 5. Port Already in Use
**Error:** `EADDRINUSE: address already in use :::5000`
**Solution:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

#### 6. Audio File Format Issues
**Error:** `Invalid audio file type`
**Solution:** Ensure audio file is in supported format:
- MP3, WAV, OGG, MP4, M4A, AAC, WEBM

---

## 📝 Notes

- Audio files are temporarily stored in `uploads/` and automatically deleted after processing
- Transcription uses Gemini API (requires internet connection)
- Vosk provides offline audio processing capabilities
- Multiple Gemini API keys enable better rate limit handling
- MongoDB is used for storing analysis results and user data

---

## 📄 License

MIT License - See main project README for details.

---

## 🔗 Related Documentation

- [Frontend README](../frontend/README.md)
- [Main Project README](../README.md)
- [Setup Guide](../SETUP.md)

