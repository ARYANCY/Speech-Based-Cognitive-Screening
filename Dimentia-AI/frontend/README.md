# React Frontend - Dementia Detection System

A modern React-based web interface for the dementia detection AI system. This frontend communicates with the Python Flask backend to provide text and audio analysis capabilities.

## 📋 Project Structure

```
frontend/
├── public/
│   └── index.html              # Main HTML template
├── src/
│   ├── components/
│   │   ├── TextAnalysis.js      # Text input component
│   │   ├── TextAnalysis.css
│   │   ├── AudioAnalysis.js     # Audio upload component
│   │   ├── AudioAnalysis.css
│   │   ├── ResultsDisplay.js    # Results display component
│   │   └── ResultsDisplay.css
│   ├── services/
│   │   └── apiService.js        # API client for Flask backend
│   ├── App.js                   # Main app component
│   ├── App.css
│   ├── index.js                 # React entry point
│   └── index.css
├── package.json                 # Project dependencies
├── .env.example                 # Environment variables template
└── README.md                    # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 14+ and npm (or yarn)
- Python Flask backend running on `localhost:5000`

### Installation

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Configure API URL (if needed):**
   Edit `.env` and update `REACT_APP_API_URL` if your Flask backend is running on a different port or host:
   ```
   REACT_APP_API_URL=http://localhost:5000
   ```

### Running the Development Server

```bash
npm start
```

The app will open automatically at `http://localhost:3000`. The page will reload when you make changes.

### Building for Production

```bash
npm run build
```

This creates a production-ready build in the `build/` folder.

## 📚 Features

### Text Analysis Tab
- **Text Input:** Enter or paste text for analysis
- **Character & Word Count:** Real-time count of characters and words
- **Input Validation:** Displays validation errors (minimum 3 words, 10 characters)
- **Analysis:** Send text to backend for dementia risk assessment

### Audio Analysis Tab
- **File Upload:** Drag-and-drop or select audio files
- **Supported Formats:** MP3, WAV, OGG, MP4
- **Audio Preview:** Built-in player to preview audio
- **File Info:** Displays file size and metadata
- **Transcription:** Backend transcribes audio before analysis

### Results Display
- **Prediction:** Shows "HEALTHY" or "DEMENTIA RISK DETECTED" with icon
- **Confidence Score:** Visual progress bar showing confidence percentage
- **Validation Issues:** Lists any input validation problems
- **Transcription:** Shows transcribed text for audio inputs
- **Medical Disclaimer:** Important disclaimer about screening vs. diagnosis

## 🔧 API Integration

The frontend communicates with the Flask backend via REST API:

### Endpoints Used

1. **Health Check**
   ```
   GET /health
   ```

2. **Text Prediction**
   ```
   POST /predict/text
   Body: { "text": "user input text" }
   Response: { "prediction": "Healthy" | "Dementia", "confidence": 0.95, "validation_issues": [] }
   ```

3. **Audio Prediction**
   ```
   POST /predict/audio
   Body: FormData with audio file
   Response: { "prediction": "Healthy" | "Dementia", "confidence": 0.95, "transcription": "...", "validation_issues": [] }
   ```

### API Service (`src/services/apiService.js`)

The `apiService` module handles all API communication:

```javascript
import apiService from '../services/apiService';

// Text prediction
const result = await apiService.predictText('hello world');

// Audio prediction
const result = await apiService.predictAudio(audioFile);

// Health check
const health = await apiService.checkHealth();
```

## 🎨 Styling

The app uses custom CSS with:
- **Gradient backgrounds:** Purple/blue gradient theme
- **Responsive design:** Mobile-first approach
- **Smooth animations:** Transitions and loading spinners
- **Accessible colors:** High contrast for readability

### Color Palette
- **Primary:** #667eea (Indigo) - #764ba2 (Purple)
- **Success:** #4caf50 (Green) - for healthy predictions
- **Danger:** #f44336 (Red) - for dementia predictions
- **Warning:** #ffc107 (Amber) - for validation issues

## 🔐 CORS Configuration

The Flask backend needs to allow CORS requests from the React frontend. Ensure your Flask `api.py` includes:

```python
from flask_cors import CORS
app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from React
```

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop browsers (1920px+)
- Tablets (768px - 1024px)
- Mobile devices (320px - 767px)

## 🧪 Testing

Run tests with:
```bash
npm test
```

## 📦 Dependencies

- **react**: UI library (18.2.0+)
- **react-dom**: React DOM rendering
- **react-scripts**: Build and development tools
- **axios**: HTTP client for API calls
- **react-icons**: Icon library (optional, not currently used but available)

## 🚨 Troubleshooting

### API Connection Error
- Ensure Flask backend is running on the configured URL
- Check `REACT_APP_API_URL` in `.env` matches your Flask server
- Verify CORS is enabled in Flask

### Audio Upload Issues
- Check browser console for specific file type errors
- Ensure audio file is in supported format (MP3, WAV, OGG, MP4)
- File size should be reasonable (< 50MB recommended)

### Port Already in Use
If port 3000 is already in use:
```bash
PORT=3001 npm start
```

## 🤝 Integration with Flask Backend

To run the complete system:

1. **Terminal 1 - Start Flask backend:**
   ```bash
   cd /path/to/project
   python3 src/api.py
   ```

2. **Terminal 2 - Start React frontend:**
   ```bash
   cd frontend
   npm start
   ```

The React app will automatically connect to the Flask API on `http://localhost:5000`.

## 📝 Environment Variables

Create a `.env` file in the `frontend/` directory:

```
REACT_APP_API_URL=http://localhost:5000
```

**Available variables:**
- `REACT_APP_API_URL`: Flask backend URL (default: `http://localhost:5000`)

## 🔄 Component Communication Flow

```
TextAnalysis/AudioAnalysis
    ↓
    → Collects user input
    ↓
    → Calls apiService
    ↓
    → Flask API
    ↓
    → ML Model (Python backend)
    ↓
    → Returns prediction
    ↓
ResultsDisplay
    ↓
    → Displays results to user
```

## 📄 File Descriptions

### `src/App.js`
Main application component managing tabs and state:
- Tabs: Text Analysis, Audio Analysis
- State management: results, loading, error
- Tab switching logic

### `src/components/TextAnalysis.js`
Handles text input and analysis:
- Textarea for user input
- Character/word counter
- Analyze button
- Clear button
- Input validation info

### `src/components/AudioAnalysis.js`
Handles audio upload and analysis:
- File input with drag-drop styling
- Audio preview player
- File information display
- Analyze button
- Clear button

### `src/components/ResultsDisplay.js`
Displays analysis results:
- Prediction (Healthy/Dementia)
- Confidence score with progress bar
- Transcription (if audio)
- Validation issues list
- Medical disclaimer

### `src/services/apiService.js`
API client for backend communication:
- `checkHealth()`: Health check
- `predictText()`: Text prediction
- `predictAudio()`: Audio prediction
- Error handling and mapping

## 🔗 Related Files

- **Backend API:** `../src/api.py`
- **Backend Predictor:** `../src/predict_text.py`
- **Backend Audio:** `../src/predict_audio.py`

## 📧 Support

For issues or questions, check:
1. Frontend README (this file)
2. Backend API documentation in `../src/api.py`
3. Main project README in `../README.md`

## ✅ Production Deployment

For deploying to production:

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Serve the build folder** with a web server (e.g., Nginx, Apache)

3. **Configure Flask API** for CORS and production settings

4. **Update environment variables** for production URLs

5. **Enable HTTPS** for secure communication

See deployment guides for specific platforms (Vercel, Netlify, AWS, etc.)
