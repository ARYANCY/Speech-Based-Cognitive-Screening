# Maitri Dementia Assessment – Backend

## Overview
Node.js/Express API for speech-based screening signals. It extracts acoustic features, optionally transcribes with Whisper, detects filler words, and runs a trained classifier (via Python scikit-learn) to produce a risk label and confidence. **This is not a medical device and is not clinically validated.**

## API
- `POST /predict/audio`
  - Form-data: `audio` (file, MP3/WAV/OGG/MP4/M4A/AAC/WebM)
  - Optional: `paragraph` (string) to enforce context match; `useWhisper` (default `true`)
  - Response: `{ prediction, confidence, features, transcription?, filler_words?, filler_count?, filler_words_list?, total_words?, text_similarity?, is_valid }`
- `GET /health` – service heartbeat

## Processing pipeline
1) **Pre-process**: Convert audio to mono 16 kHz WAV (ffmpeg-static).  
2) **Feature extraction (JS)**: RMS mean/std, Zero-Crossing Rate mean/std, speech/pause ratios, pause count/rate/mean/max, speech activity/sec, spectral centroid mean/std.  
3) **(Optional) Transcription (Python Whisper)**: Local `openai-whisper` model; filler word detection with timestamps (`um`, `uh`, `oh`, `like`, etc.); paragraph similarity (Jaccard; requires ≥60% to accept results when `paragraph` provided).  
4) **Classification (Python scikit-learn)**: Loads `audio_scaler.joblib` and `audio_classifier.joblib`, predicts label + confidence.  
5) **Response**: Combines ML output with extracted features and transcription extras (if enabled/valid).

## Clinical Measures & Biomarkers

### Overview
The Maitri Dementia Assessment system analyzes speech patterns using **acoustic and prosodic features** that have been associated with cognitive decline in research literature. These measures capture changes in speech production that may indicate early signs of dementia.

### Primary Clinical Measures

#### 1. **Pause Analysis** (Prosodic Features)
- **Pause Count**: Number of silent intervals during speech
- **Pause Duration**: Mean and maximum pause lengths
- **Pause Rate**: Frequency of pauses per second
- **Pause Ratio**: Proportion of speech time spent in silence

**Clinical Rationale**: 
- Increased pause frequency and duration are associated with word-finding difficulties
- Longer pauses may indicate cognitive effort to retrieve words or formulate thoughts
- Research shows individuals with dementia exhibit more frequent and longer pauses (Konig et al., 2015; Fraser et al., 2016)

#### 2. **Speech Activity Patterns**
- **Speech Ratio**: Proportion of audio containing speech vs. silence
- **Speech Activity Rate**: Amount of speech activity per second

**Clinical Rationale**:
- Reduced speech activity may indicate decreased verbal fluency
- Lower speech-to-pause ratios correlate with cognitive impairment severity
- Helps quantify overall speech production efficiency

#### 3. **Acoustic Energy Analysis (RMS)**
- **RMS Mean**: Average acoustic energy (loudness/intensity)
- **RMS Standard Deviation**: Variability in speech intensity

**Clinical Rationale**:
- Reduced or inconsistent energy may reflect motor speech changes
- Lower energy variability can indicate reduced prosodic variation
- Associated with hypophonia (reduced voice volume) in Parkinson's-related dementia

#### 4. **Zero Crossing Rate (ZCR)**
- **ZCR Mean**: Average rate of signal sign changes (voice quality indicator)
- **ZCR Standard Deviation**: Variability in voice quality

**Clinical Rationale**:
- ZCR reflects voice quality and pitch characteristics
- Changes may indicate vocal fold dysfunction or reduced vocal control
- Lower ZCR variability suggests reduced prosodic expression

#### 5. **Spectral Centroid**
- **Centroid Mean**: Average frequency "brightness" of speech
- **Centroid Standard Deviation**: Variability in spectral characteristics

**Clinical Rationale**:
- Reflects formant frequencies and vocal tract characteristics
- Changes may indicate articulatory difficulties
- Reduced variability suggests less dynamic speech production

#### 6. **Filler Word Detection** (Optional - via Whisper)
- **Filler Count**: Frequency of hesitation markers (um, uh, oh, like, etc.)
- **Filler Word List**: Specific filler words detected with timestamps

**Clinical Rationale**:
- Increased filler word usage may indicate word-finding difficulties
- Hesitation markers often increase when cognitive load is high
- Research shows correlation between filler frequency and cognitive decline (Ahmed et al., 2013)

#### 7. **Context Adherence** (Optional - via Whisper)
- **Text Similarity**: Comparison of transcribed speech to expected paragraph
- **Validation Threshold**: 60% similarity required for valid assessment

**Clinical Rationale**:
- Tests ability to follow instructions and maintain context
- Reduced similarity may indicate attention or memory issues
- Helps ensure assessment validity by confirming task completion

### Feature Extraction Methodology

1. **Audio Preprocessing**:
   - Conversion to mono, 16 kHz sampling rate
   - Signal normalization to [-1, 1] range
   - Frame-based analysis (30ms frames, 10ms hop)

2. **Voice Activity Detection**:
   - Adaptive energy threshold: `median(RMS) + 0.5 × std(RMS)`
   - Frames above threshold classified as speech
   - Silent runs identified as pauses

3. **Feature Calculation**:
   - Temporal features: duration, pause statistics
   - Energy features: RMS mean/std per frame
   - Frequency features: ZCR, spectral centroid via FFT
   - Prosodic features: speech/pause ratios, activity rates

### Research Foundation

The features used in this system are based on established research findings:

- **Pause Analysis**: Multiple studies have shown that pause patterns differ significantly between healthy individuals and those with dementia (Konig et al., 2015; Fraser et al., 2016)
- **Prosodic Changes**: Reduced prosodic variation is a documented feature of dementia-related speech (Martinez-Sanchez et al., 2017)
- **Acoustic Features**: Energy and spectral characteristics have been used in automated dementia screening systems (Lopez-de-Ipina et al., 2013)
- **Filler Words**: Increased hesitation markers correlate with cognitive assessment scores (Ahmed et al., 2013)

### Clinical Validation Status

⚠️ **Important**: This system is **NOT clinically validated** and should **NOT** be used for:
- Clinical diagnosis
- Treatment decisions
- Replacing professional medical evaluation
- Standalone screening without clinical oversight

### Model Training

The classification model (Logistic Regression) is trained on:
- **Features**: 14 acoustic/prosodic features extracted from audio
- **Labels**: Binary classification (Healthy vs. Dementia)
- **Preprocessing**: StandardScaler normalization
- **Training Data**: Requires labeled audio samples in `data/healthy/` and `data/dementia/` directories

### Limitations & Considerations

1. **Data Dependency**: Model performance depends on training data quality and diversity
2. **Language**: Currently optimized for English speech patterns
3. **Audio Quality**: Requires clear audio recordings without excessive noise
4. **Individual Variation**: Speech patterns vary significantly between individuals
5. **Co-morbidities**: Other conditions (hearing loss, motor disorders) may affect results
6. **Cultural Factors**: Speech patterns vary across cultures and languages

### Recommended Clinical Workflow

If used in a clinical or research setting:

1. **Informed Consent**: Participants must understand this is a research tool
2. **Standardized Protocol**: Use consistent recording conditions and instructions
3. **Clinical Correlation**: Always correlate results with standard cognitive assessments (MMSE, MoCA, etc.)
4. **Professional Review**: Results should be reviewed by qualified healthcare professionals
5. **Follow-up**: Positive findings should trigger comprehensive clinical evaluation
6. **Ethics Approval**: Research use requires appropriate IRB/ethics committee approval

### References

- Ahmed, S., et al. (2013). "Detecting dementia from speech: A systematic review." *Journal of Alzheimer's Disease*
- Fraser, K. C., et al. (2016). "Automated classification of primary progressive aphasia subtypes from narrative speech transcripts." *Cortex*
- Konig, A., et al. (2015). "Automatic speech analysis for the assessment of patients with predementia and Alzheimer's disease." *Alzheimer's & Dementia*
- Lopez-de-Ipina, K., et al. (2013). "On the selection of non-invasive methods based on speech analysis oriented to automatic Alzheimer disease diagnosis." *Sensors*
- Martinez-Sanchez, F., et al. (2017). "Speech rate and rhythm in Alzheimer's disease." *Aging & Mental Health*

---

> **Disclaimer**: These are **research-oriented digital speech markers**, not validated clinical biomarkers. The system does not diagnose dementia and should not be used for clinical decisions without proper validation and regulatory approval.

## Requirements
- Node.js 18+  
- Python 3.8+ with packages in `requirements.txt` (`openai-whisper`, `numpy`, `scikit-learn`, etc.)  
- ffmpeg (bundled via `ffmpeg-static`; system ffmpeg recommended for robustness)

## Environment
- `PORT` (default `5000`)
- `MAX_FILE_SIZE` (MB, default `50`)
- `CORS_ORIGIN` (default `*`)
- `WHISPER_MODEL` (optional; e.g., `tiny`, `base`, `small`, `medium`, `large`; default `base`)

## Setup
```bash
cd backend
npm install
pip install -r ../requirements.txt
```
Place trained models in `models/`:
- `audio_scaler.joblib`
- `audio_classifier.joblib`

## Run
```bash
cd backend
npm start
```
API served at `http://localhost:5000`.

## Notes on clinical use
- No clinical validation performed; outputs are for screening/educational purposes only.
- Not a substitute for professional medical evaluation.
- If pursuing clinical studies, establish IRB/ethics approval, data handling compliance, and validate against clinical gold standards.

# Node.js/Express Backend

Express.js backend for the Dementia Detection System. Replaces the Python Flask backend with a lightweight Node.js server that calls Python prediction scripts.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Create Environment File
```bash
cp .env.example .env
# Edit .env if needed (default: PORT=5000)
```

### 3. Start Server
```bash
npm start
# Or for development with auto-reload:
npm run dev
```

Server runs on `http://localhost:5000`

## 📦 Dependencies

- **express**: Web framework
- **cors**: Cross-Origin Resource Sharing
- **multer**: File upload handling
- **dotenv**: Environment configuration
- **uuid**: Generate unique file IDs

## 🔌 API Endpoints

### Health Check
```bash
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "message": "API is running",
  "timestamp": "2024-12-01T12:00:00.000Z"
}
```

### Text Prediction
```bash
POST /predict/text
Content-Type: application/json

{
  "text": "hello how are you doing today"
}
```

**Response:**
```json
{
  "prediction": "Healthy",
  "label": 0,
  "confidence": 0.95,
  "validation_issues": []
}
```

### Audio Prediction
```bash
POST /predict/audio
Content-Type: multipart/form-data

audio: <audio_file>
```

**Response:**
```json
{
  "prediction": "Healthy",
  "label": 0,
  "confidence": 0.95,
  "transcription": "hello how are you doing today",
  "text": "hello how are you doing today",
  "validation_issues": []
}
```

## 📁 Project Structure

```
backend/
├── server.js           # Main Express app
├── package.json        # Dependencies
├── .env.example        # Environment template
├── .gitignore
└── README.md           # This file
```

## ⚙️ Configuration

Create `.env` file:
```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
MAX_FILE_SIZE=52428800
UPLOAD_DIR=./uploads
```

## 🔄 How It Works

1. **Request arrives** at Express server
2. **Input validated** (text length, file type)
3. **Python script called** via child_process
4. **Script output parsed** as JSON
5. **Response sent** to client

## 🐍 Python Integration

The backend uses `child_process.spawn()` to call Python scripts:
- `src/predict_text.py` - Text prediction
- `src/predict_audio.py` - Audio prediction

Both scripts now output JSON format.

## 📊 File Upload

- **Directory**: `backend/uploads/`
- **Max Size**: 50MB (configurable)
- **Formats**: MP3, WAV, OGG, M4A
- **Cleanup**: Temporary files auto-deleted after processing

## 🔒 Security

- ✅ CORS enabled for React frontend
- ✅ File type validation
- ✅ File size limits
- ✅ Input validation
- ✅ Error handling

## 🧪 Testing

### Test Health Endpoint
```bash
curl http://localhost:5000/health
```

### Test Text Prediction
```bash
curl -X POST http://localhost:5000/predict/text \
  -H "Content-Type: application/json" \
  -d '{"text":"hello how are you doing"}'
```

### Test Audio Prediction
```bash
curl -X POST http://localhost:5000/predict/audio \
  -F "audio=@path/to/audio.mp3"
```

## 🛑 Troubleshooting

### Port Already in Use
```bash
# Use different port
PORT=5001 npm start
```

### Python Script Not Found
Ensure `src/` directory exists in parent folder with Python scripts.

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Python Not Available
```bash
# Ensure Python3 is installed
python3 --version

# Or adjust server.js to use 'python' instead of 'python3'
```

## 📈 Performance

- Zero Python/ML code in Node
- Lightweight (~10KB)
- Fast startup
- Efficient process pooling

## 🚀 Deployment

### Environment Variables
Set in production:
```bash
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
```

### Run as Service
```bash
# Using PM2
pm2 start server.js --name "dementia-backend"
pm2 save
```

### Docker (Optional)
```dockerfile
FROM node:18
WORKDIR /app/backend
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 📝 Logs

Access logs from Express output:
- Request details
- Python script errors
- File handling logs

## 🔗 Integration with React Frontend

Update React `.env`:
```env
REACT_APP_API_URL=http://localhost:5000
```

Both run on different ports:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

## ✅ Checklist

Before deploying:
- [ ] Node.js 14+ installed
- [ ] Python3 installed
- [ ] Dependencies installed: `npm install`
- [ ] Environment file created: `.env`
- [ ] Python scripts in `src/` directory
- [ ] Models in `models/` directory
- [ ] Test health endpoint
- [ ] Test text prediction
- [ ] Test audio prediction

## 📞 Support

Issues? Check:
1. Python scripts exist in `src/`
2. Python3 is available in PATH
3. Node modules installed
4. Environment variables set
5. Ports not in use

---

**Version:** 1.0  
**Status:** Production Ready ✅  
**Backend Type:** Express.js
