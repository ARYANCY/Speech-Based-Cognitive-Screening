# 🚀 Setup Guide - Dementia Detection System

Complete setup instructions for the Dementia Detection System.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** 14+ ([Download](https://nodejs.org/))
- **Python** 3.7+ ([Download](https://www.python.org/))
- **npm** (comes with Node.js)
- **pip** (comes with Python)
- **FFmpeg** ([Download](https://ffmpeg.org/download.html)) - **REQUIRED for audio processing**

### Verify Installations

```bash
node --version    # Should show v14.0.0 or higher
python --version # Should show Python 3.7 or higher
npm --version    # Should show version number
pip --version    # Should show version number
```

---

## 📦 Installation Steps

### Step 1: Install FFmpeg (Required for Audio Processing)

**FFmpeg is required for Whisper to process audio files.**

#### Quick Setup (If FFmpeg is in backend folder):

The system will automatically detect FFmpeg if it's in:
```
backend/ffmpeg-*-essentials_build/bin/
```

If you have FFmpeg in the backend folder, you're all set! The system will use it automatically.

#### Manual Setup (If FFmpeg is not installed):

**Windows:**
1. Download from: https://www.gyan.dev/ffmpeg/builds/
2. Download: `ffmpeg-release-essentials.zip`
3. Extract to: `C:\ffmpeg\`
4. Add to PATH:
   - Press `Win + X` → "System" → "Advanced system settings"
   - Click "Environment Variables"
   - Under "System variables", select "Path" → "Edit"
   - Click "New" → Add: `C:\ffmpeg\bin`
   - Click "OK" on all windows
5. Verify: `ffmpeg -version` (close and reopen terminal first)

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

### Step 2: Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```
   
   This installs:
   - express
   - cors
   - multer
   - dotenv
   - uuid
   - nodemon (dev)

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
   
   Or if `pip` doesn't work:
   ```bash
   python -m pip install -r requirements.txt
   ```
   
   **Note:** This may take 5-10 minutes as it installs:
   - openai-whisper (large package for audio transcription)
   - scikit-learn (machine learning)
   - pandas, numpy, scipy (data processing)
   - joblib (model loading)
   - nltk (text processing)
   - Other required packages

### Step 3: Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install React dependencies:**
   ```bash
   npm install
   ```
   
   This installs:
   - react
   - react-dom
   - react-scripts
   - axios
   - react-icons

---

## ⚙️ Configuration (Optional)

### Backend Configuration

Create `backend/.env` file (optional):
```env
PORT=5000
NODE_ENV=development
```

If not created, defaults will be used (PORT=5000).

### Frontend Configuration

Create `frontend/.env` file (optional):
```env
REACT_APP_API_URL=http://localhost:5000
```

If not created, defaults to `http://localhost:5000`.

---

## 🚀 Running the Application

### Terminal 1: Start Backend Server

```bash
cd backend
npm start
```

**Expected Output:**
```
╔═══════════════════════════════════════╗
║   Dementia Detection Backend          ║
║   Express.js Server Running           ║
╠═══════════════════════════════════════╣
║ 🚀 Server: http://0.0.0.0:5000        ║
║ 📝 Text Endpoint: POST /predict/text   ║
║ 🎤 Audio Endpoint: POST /predict/audio ║
║ 💚 Health Check: GET /health           ║
╚═══════════════════════════════════════╝
```

**Keep this terminal open!**

### Terminal 2: Start Frontend

Open a **new terminal window** and run:

```bash
cd frontend
npm start
```

**Expected Output:**
- React development server starts
- Browser automatically opens to `http://localhost:3000`
- Hot reload enabled (changes auto-refresh)

---

## ✅ Verify Installation

### Test Backend

Open a new terminal and test the health endpoint:

```bash
curl http://localhost:5000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-12-08T..."
}
```

### Test Frontend

1. Open browser: `http://localhost:3000`
2. You should see the Dementia Detection System interface
3. Try the Audio Analysis or Text Analysis tabs

---

## 🧪 Testing the System

### Test Text Prediction

**Using curl:**
```bash
curl -X POST http://localhost:5000/predict/text \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"I went to the store yesterday and bought some groceries. The weather was nice so I walked there.\"}"
```

**Using Frontend:**
1. Go to Text Analysis tab
2. Enter some text (at least 3 words)
3. Click "Analyze Text"
4. View results

### Test Audio Prediction

**Using curl:**
```bash
curl -X POST http://localhost:5000/predict/audio \
  -F "audio=@backend/samples/test1.ogg"
```

**Using Frontend:**
1. Go to Audio Analysis tab
2. Upload an audio file or record using microphone
3. Click "Analyze Audio"
4. View results

---

## 🐛 Troubleshooting

### Backend Issues

**Error: Cannot find module 'express'**
```bash
cd backend
npm install
```

**Error: ModuleNotFoundError: No module named 'joblib'**
```bash
cd backend
pip install -r requirements.txt
```

**Error: Port 5000 already in use**
- Change PORT in `backend/.env` to another port (e.g., 5001)
- Or stop the process using port 5000

**Error: Python not found**
- Ensure Python is installed and in PATH
- Try `python` instead of `python3` on Windows
- Server.js auto-detects Windows/Unix

**Error: [WinError 2] The system cannot find the file specified (Audio Processing)**
- **FFmpeg is not installed** - This is required for audio transcription
- Install FFmpeg (see Step 1 in Installation Steps above)
- Add FFmpeg to your system PATH
- Verify installation: `ffmpeg -version`
- Restart your terminal/command prompt after installing
- Restart the backend server after installing FFmpeg

**Error: Transcription failed: FFmpeg not found**
- Install FFmpeg (see Step 1 in Installation Steps)
- Ensure FFmpeg is in your system PATH
- Restart the backend server after installing

### Frontend Issues

**Error: 'react-scripts' is not recognized**
```bash
cd frontend
npm install
```

**Error: Port 3000 already in use**
```bash
PORT=3001 npm start
```

**Error: Cannot connect to API**
- Ensure backend is running on port 5000
- Check `REACT_APP_API_URL` in `frontend/.env`
- Verify CORS is enabled in backend

**Error: Module not found**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Python Issues

**Error: pip not found**
- Use `python -m pip` instead of `pip`
- Or install pip: `python -m ensurepip --upgrade`

**Error: Permission denied**
- Use `pip install --user -r requirements.txt`
- Or run as administrator

**Error: Whisper model download fails**
- Ensure internet connection
- First run downloads ~150MB model
- Check firewall settings

---

## 📁 Project Structure

```
DEMENTIA/
├── backend/              # Backend server
│   ├── server.js        # Express API server
│   ├── src/             # Python ML scripts
│   ├── models/          # Trained ML models
│   ├── transcripts/     # Training data
│   ├── samples/         # Audio samples
│   ├── package.json     # Node.js dependencies
│   └── requirements.txt # Python dependencies
│
└── frontend/            # React frontend
    ├── src/             # React components
    ├── public/          # Static files
    └── package.json     # Frontend dependencies
```

---

## 🔧 Development Mode

### Backend with Auto-reload

```bash
cd backend
npm run dev
```

Requires `nodemon` (installed as dev dependency).

### Frontend Development

Frontend automatically reloads on file changes when running `npm start`.

---

## 📊 System Requirements

### Minimum Requirements
- **RAM:** 4GB
- **Disk Space:** 2GB (for dependencies and models)
- **Internet:** Required for initial setup (downloading packages)

### Recommended
- **RAM:** 8GB+
- **Disk Space:** 5GB+
- **CPU:** Multi-core recommended for faster processing

---

## ✅ Installation Checklist

Before running the application, verify:

- [ ] Node.js installed (`node --version`)
- [ ] Python installed (`python --version`)
- [ ] Backend dependencies installed (`cd backend && npm install`)
- [ ] Python packages installed (`cd backend && pip install -r requirements.txt`)
- [ ] Frontend dependencies installed (`cd frontend && npm install`)
- [ ] Backend server starts without errors
- [ ] Frontend server starts without errors
- [ ] Health endpoint responds (`curl http://localhost:5000/health`)

---

## 🎯 Quick Start Commands

**Complete setup (run once):**
```bash
# Backend
cd backend
npm install
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

**Start application:**
```bash
# Terminal 1 - Backend
cd backend && npm start

# Terminal 2 - Frontend
cd frontend && npm start
```

---

## 📚 Additional Resources

- **Backend API Docs:** `backend/README.md`
- **Frontend Docs:** `frontend/README.md`
- **Dataset Info:** `backend/DATASET_INFO.md`
- **Project Structure:** See directory listing

---

## 🆘 Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all prerequisites are installed
3. Ensure all dependencies are installed
4. Check that ports 3000 and 5000 are available
5. Review error messages in terminal output

---

## ✨ Features After Setup

Once setup is complete, you'll have access to:

- ✅ Audio analysis with transcription
- ✅ Text analysis
- ✅ Real-time predictions
- ✅ Confidence scoring
- ✅ Feature analysis
- ✅ History tracking
- ✅ Statistics dashboard
- ✅ Dark mode

---

**Last Updated:** December 2024  
**Version:** 2.0  
**Status:** Ready for Setup ✅

