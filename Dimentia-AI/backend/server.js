const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { predictAudio } = require('./lib/audioPredictor');

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '50', 10) * 1024 * 1024; // Default 50MB
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Validate PORT
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  console.error('Invalid PORT:', PORT);
  process.exit(1);
}

// Middleware
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure upload directory
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for audio uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowedMimes = new Set([
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
      'audio/ogg', 'audio/oga', 'audio/mp4', 'audio/x-m4a',
      'audio/aac', 'audio/x-aac',
      'audio/webm',
    ]);
    const extAllowed = /\.(mp3|wav|ogg|oga|mp4|m4a|aac|webm)$/i;
    if (file && (allowedMimes.has(file.mimetype) || extAllowed.test(file.originalname || ''))) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio file type. Supported: MP3, WAV, OGG, MP4, AAC, WebM'));
    }
  }
});

// ========================
// API ENDPOINTS
// ========================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'dementia-detection-api',
    version: '1.0.0'
  });
});

app.post('/predict/audio', upload.single('audio'), async (req, res) => {
  let uploadedFile = null;

  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'Missing "audio" field',
        code: 'MISSING_AUDIO_FILE'
      });
    }

    uploadedFile = req.file.path;
    const expectedText = req.body.paragraph || req.body.expectedText || null;
    const useWhisper = req.body.useWhisper !== 'false'; // Default to true
    
    console.log(`[${new Date().toISOString()}] Analyzing audio: ${uploadedFile}`);
    if (expectedText) {
      console.log(`[${new Date().toISOString()}] Expected text provided for validation`);
    }

    // Use Node.js modules for prediction
    const result = await predictAudio(uploadedFile, {
      expectedText: expectedText,
      useWhisper: useWhisper
    });
    
    return res.json({
      prediction: result.prediction,
      label: result.label,
      confidence: result.confidence,
      features: result.features || {},
      transcription: result.transcription,
      filler_words: result.filler_words || [],
      filler_count: result.filler_count || 0,
      filler_words_list: result.filler_words_list || [],
      total_words: result.total_words || 0,
      text_similarity: result.text_similarity,
      is_valid: result.is_valid
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Audio prediction error:`, error);
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    const errorMsg = error.message || 'Audio prediction failed';
    
    if (errorMsg.includes('not found') || errorMsg.includes('File not found')) {
      statusCode = 404;
    } else if (errorMsg.includes('Invalid') || 
               errorMsg.includes('too short') || 
               errorMsg.includes('too large') ||
               errorMsg.includes('Missing required')) {
      statusCode = 400;
    } else if (errorMsg.includes('timed out')) {
      statusCode = 504;
    }
    
    return res.status(statusCode).json({ 
      error: errorMsg,
      code: 'PREDICTION_ERROR'
    });
  } finally {
    // Cleanup uploaded file
    if (uploadedFile && fs.existsSync(uploadedFile)) {
      fs.unlink(uploadedFile, (err) => {
        if (err) {
          console.error(`[${new Date().toISOString()}] Error deleting temp file ${uploadedFile}:`, err);
        }
      });
    }
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Unhandled error:`, err);
  
  // Handle multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        code: 'FILE_TOO_LARGE'
      });
    }
    return res.status(400).json({ 
      error: err.message,
      code: 'UPLOAD_ERROR'
    });
  }
  
  res.status(500).json({
    error: err.message || 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR'
  });
});

app.listen(PORT, () => {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║   Dementia Detection Backend          ║');
  console.log('║   Express.js Server Running           ║');
  console.log('╠═══════════════════════════════════════╣');
  console.log(`║ 🚀 Server: http://0.0.0.0:${PORT}             ║`);
  console.log('║ 🎤 Audio Endpoint: POST /predict/audio ║');
  console.log('║ 💚 Health Check: GET /health           ║');
  console.log(`║ 📦 Max File Size: ${MAX_FILE_SIZE / (1024 * 1024)}MB              ║`);
  console.log('╚═══════════════════════════════════════╝\n');
});
