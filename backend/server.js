const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { MongoClient } = require('mongodb');

dotenv.config();

// MongoDB connection
let mongodbClient = null;
let mongodbDb = null;
const MONGODB_URI = process.env.MONGODB_URI;

// Simple in-memory session store (for production, use Redis or JWT)
const sessions = new Map();

async function connectMongoDB() {
  if (MONGODB_URI) {
    try {
      mongodbClient = await MongoClient.connect(MONGODB_URI);
      mongodbDb = mongodbClient.db();
      console.log('✅ MongoDB connected successfully');
      
      // Create indexes for better performance
      const usersCollection = mongodbDb.collection('users');
      const resultsCollection = mongodbDb.collection('results');
      
      await usersCollection.createIndex({ email: 1 }, { unique: true });
      await resultsCollection.createIndex({ userId: 1, createdAt: -1 });
      await resultsCollection.createIndex({ userId: 1 });
      
      console.log('✅ MongoDB indexes created');
    } catch (err) {
      console.error('❌ MongoDB connection error:', err.message);
    }
  } else {
    console.warn('⚠️  MONGODB_URI not set - MongoDB features disabled');
  }
}

connectMongoDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure upload directory
const uploadDir = path.join(__dirname, './uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for audio uploads
const multer = require('multer');
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
  fileFilter: (req, file, cb) => {
    const allowedMimes = new Set([
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
      'audio/ogg', 'audio/oga', 'audio/mp4', 'audio/x-m4a',
      'audio/aac', 'audio/x-aac',
      'audio/webm', // allow webm from browser recordings
    ]);
    const extAllowed = /\.(mp3|wav|ogg|oga|mp4|m4a|aac|webm)$/i;
    if (file && (allowedMimes.has(file.mimetype) || extAllowed.test(file.originalname || ''))) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio file type'));
    }
  }
});

// ========================
// UTILITY FUNCTIONS
// ========================

async function callPythonPredictor(scriptPath, args, timeout = 300000) {
  return new Promise((resolve, reject) => {
    // Try python3 first, fallback to python (for Windows compatibility)
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const python = spawn(pythonCmd, [scriptPath, ...args]);
    let stdout = '';
    let stderr = '';
    let timeoutId = null;

    // Set timeout for long-running operations (5 minutes default)
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        python.kill();
        reject(new Error(`Python script timeout after ${timeout/1000}s. The operation may be taking too long.`));
      }, timeout);
    }

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      const stderrText = data.toString();
      stderr += stderrText;
      // Filter out Whisper download progress (it writes to stderr but isn't an error)
      if (!stderrText.includes('%|') && !stderrText.includes('iB/s') && !stderrText.trim().match(/^\d+%\|/)) {
        // This might be a real error, but we'll check on close
      }
    });

    python.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      
      // Clean stderr - remove progress bars and warnings
      const cleanStderr = stderr
        .split('\n')
        .filter(line => {
          // Filter out progress bars, download messages, and common warnings
          return !line.includes('%|') && 
                 !line.includes('iB/s') && 
                 !line.match(/^\d+%\|/) &&
                 !line.includes('Downloading') &&
                 !line.includes('100%') &&
                 !line.trim().match(/^\d+\/\d+/) &&
                 !line.includes('FP16 is not supported') &&
                 !line.includes('INFO:') && // Filter logging info
                 line.trim().length > 0;
        })
        .join('\n')
        .trim();

      if (code !== 0) {
        // Only reject if there's actual error content (not just progress bars)
        if (cleanStderr && cleanStderr.length > 0) {
          reject(new Error(`Python script failed: ${cleanStderr}`));
        } else {
          // Exit code non-zero but no real error message - might be JSON parsing issue
          reject(new Error(`Python script exited with code ${code}. Output: ${stdout.substring(0, 200)}`));
        }
      } else {
        // Script succeeded - try to parse JSON from stdout
        try {
          const result = JSON.parse(stdout);
          return resolve(result);
        } catch (e) {
          try {
            // Try to extract JSON from stdout (in case there's extra output)
            const start = stdout.lastIndexOf('{');
            const end = stdout.lastIndexOf('}');
            if (start !== -1 && end !== -1 && end > start) {
              const candidate = stdout.slice(start, end + 1);
              const parsed = JSON.parse(candidate);
              return resolve(parsed);
            }
            const jsonMatch = stdout.match(/\{[\s\S]*\}$/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              return resolve(parsed);
            }
          } catch (innerErr) {
            console.error('JSON extraction error:', innerErr.message);
            console.error('Stdout (first 500 chars):', stdout.substring(0, 500));
            console.error('Stderr (cleaned, first 500 chars):', cleanStderr.substring(0, 500));
          }
          reject(new Error(`Failed to parse Python output. Output: ${stdout.substring(0, 200)}`));
        }
      }
    });

    python.on('error', (err) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(new Error(`Failed to start Python: ${err.message}. Make sure Python is installed and in PATH.`));
    });
  });
}

function validateTextInput(text) {
  const issues = [];
  if (!text || text.trim().length === 0) {
    issues.push("Text cannot be empty");
  }
  return issues;
}

// Simple authentication middleware
function authenticateUser(req, res, next) {
  const sessionId = req.headers['x-session-id'] || req.body.sessionId || req.query.sessionId;
  
  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required. Please sign up or login.' });
  }
  
  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(401).json({ error: 'Invalid session. Please login again.' });
  }
  
  req.userId = session.userId;
  req.userEmail = session.email;
  next();
}

// Optional authentication - doesn't fail if no session
function optionalAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'] || req.body.sessionId || req.query.sessionId;
  
  if (sessionId) {
    const session = sessions.get(sessionId);
    if (session) {
      req.userId = session.userId;
      req.userEmail = session.email;
    }
  }
  next();
}

// ========================
// API ENDPOINTS
// ========================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========================
// USER AUTHENTICATION ENDPOINTS
// ========================

app.post('/auth/signup', async (req, res) => {
  try {
    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    if (!mongodbDb) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const usersCollection = mongodbDb.collection('users');
    
    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
      // User exists - create session and return
      const sessionId = uuidv4();
      sessions.set(sessionId, {
        userId: existingUser._id.toString(),
        email: existingUser.email,
        name: existingUser.name,
        createdAt: new Date()
      });
      
      return res.json({
        success: true,
        sessionId,
        user: {
          id: existingUser._id.toString(),
          name: existingUser.name,
          email: existingUser.email
        },
        message: 'Login successful'
      });
    }
    
    // Create new user
    const newUser = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await usersCollection.insertOne(newUser);
    
    // Create session
    const sessionId = uuidv4();
    sessions.set(sessionId, {
      userId: result.insertedId.toString(),
      email: newUser.email,
      name: newUser.name,
      createdAt: new Date()
    });
    
    res.json({
      success: true,
      sessionId,
      user: {
        id: result.insertedId.toString(),
        name: newUser.name,
        email: newUser.email
      },
      message: 'Signup successful'
    });
    
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message || 'Signup failed' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    if (!mongodbDb) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const usersCollection = mongodbDb.collection('users');
    const user = await usersCollection.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please sign up first.' });
    }
    
    // Create session
    const sessionId = uuidv4();
    sessions.set(sessionId, {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      createdAt: new Date()
    });
    
    res.json({
      success: true,
      sessionId,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

app.get('/auth/me', authenticateUser, async (req, res) => {
  try {
    if (!mongodbDb) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const usersCollection = mongodbDb.collection('users');
    const { ObjectId } = require('mongodb');
    const user = await usersCollection.findOne({ _id: new ObjectId(req.userId) });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message || 'Failed to get user' });
  }
});

// ========================
// RESULTS SUMMARY ENDPOINT
// ========================

app.get('/results/summary', authenticateUser, async (req, res) => {
  try {
    if (!mongodbDb) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const resultsCollection = mongodbDb.collection('results');
    const ObjectId = require('mongodb').ObjectId;
    
    // Get last 5 results for user
    const results = await resultsCollection
      .find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    // Calculate summary statistics
    const summary = {
      totalTests: results.length,
      averageDementiaProbability: 0,
      averageConfidence: 0,
      predictions: {
        Healthy: 0,
        MCI: 0,
        Moderate: 0,
        Severe: 0,
        Inconclusive: 0,
        Error: 0
      },
      recentResults: results.map(r => ({
        id: r._id.toString(),
        prediction: r.prediction,
        dementiaProbability: r.dementia_probability || r.confidence,
        confidence: r.confidence,
        createdAt: r.createdAt,
        type: r.type || 'unknown'
      })),
      trends: {
        improving: false,
        stable: false,
        declining: false
      }
    };
    
    if (results.length > 0) {
      // Calculate averages
      const validProbs = results.filter(r => r.dementia_probability !== null && r.dementia_probability !== undefined);
      const validConfs = results.filter(r => r.confidence !== null && r.confidence !== undefined);
      
      if (validProbs.length > 0) {
        summary.averageDementiaProbability = validProbs.reduce((sum, r) => sum + (r.dementia_probability || 0), 0) / validProbs.length;
      }
      
      if (validConfs.length > 0) {
        summary.averageConfidence = validConfs.reduce((sum, r) => sum + (r.confidence || 0), 0) / validConfs.length;
      }
      
      // Count predictions
      results.forEach(r => {
        const pred = r.prediction || 'Unknown';
        if (summary.predictions.hasOwnProperty(pred)) {
          summary.predictions[pred]++;
        } else {
          summary.predictions[pred] = 1;
        }
      });
      
      // Calculate trends (compare first 2 vs last 2)
      if (results.length >= 4) {
        const firstTwo = results.slice(0, 2);
        const lastTwo = results.slice(results.length - 2);
        
        const firstAvg = firstTwo.reduce((sum, r) => sum + (r.dementia_probability || r.confidence || 0), 0) / 2;
        const lastAvg = lastTwo.reduce((sum, r) => sum + (r.dementia_probability || r.confidence || 0), 0) / 2;
        
        const diff = lastAvg - firstAvg;
        if (diff < -0.05) {
          summary.trends.improving = true;
        } else if (diff > 0.05) {
          summary.trends.declining = true;
        } else {
          summary.trends.stable = true;
        }
      }
    }
    
    res.json(summary);
    
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: error.message || 'Failed to get summary' });
  }
});

app.post('/predict/text', optionalAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Missing "text" field' });
    }

    const predictorPath = path.join(__dirname, './src/predict_text.py');
    try {
      const result = await callPythonPredictor(predictorPath, [text]);
      
      const responseData = {
        prediction: result.prediction,
        label: result.label,
        confidence: result.confidence,
        flag_reason: result.flag_reason || null,
        validation_issues: result.validation_issues || [],
        features: result.features || {}
      };
      
      // Save to MongoDB if user is authenticated
      if (req.userId && mongodbDb) {
        try {
          const resultsCollection = mongodbDb.collection('results');
          await resultsCollection.insertOne({
            userId: req.userId,
            type: 'text',
            input: text.substring(0, 500), // Store first 500 chars
            prediction: result.prediction,
            label: result.label,
            confidence: result.confidence,
            dementia_probability: result.dementia_probability || result.confidence,
            createdAt: new Date()
          });
        } catch (dbError) {
          console.error('Failed to save result to database:', dbError);
          // Don't fail the request if DB save fails
        }
      }
      
      return res.json(responseData);
    } catch (pythonError) {
      console.error('Python prediction error:', pythonError.message);
      return res.status(500).json({ error: pythonError.message || 'Prediction failed' });
    }
  } catch (error) {
    console.error('Error in /predict/text:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/predict/audio', upload.single('audio'), optionalAuth, async (req, res) => {
  let uploadedFile = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Missing "audio" field' });
    }

    uploadedFile = req.file.path;
    const predictorPath = path.join(__dirname, './src/predict_audio.py');

    // Get optional memory test parameters
    const originalText = req.body.original_text || null;
    const hintText = req.body.hint_text || null;

    try {
      // Audio processing can take longer, set timeout to 5 minutes
      // Pass original_text and hint_text as environment variables or via temp file
      const args = [uploadedFile];
      if (originalText) {
        args.push('--original-text', originalText);
      }
      if (hintText) {
        args.push('--hint-text', hintText);
      }
      
      const result = await callPythonPredictor(predictorPath, args, 300000);
      
      // Validate result structure
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response from prediction script');
      }
      
      const responseData = {
        prediction: result.prediction || 'Unknown',
        label: result.label !== undefined ? result.label : null,
        confidence: result.confidence !== undefined ? result.confidence : null,
        dementia_probability: result.dementia_probability !== undefined ? result.dementia_probability : result.confidence,
        flag_reason: result.flag_reason || null,
        transcription: result.transcription || result.text || '',
        text: result.transcription || result.text || '',
        validation_issues: Array.isArray(result.validation_issues) ? result.validation_issues : [],
        features: result.features && typeof result.features === 'object' ? result.features : {}
      };
      
      // Save to MongoDB if user is authenticated
      if (req.userId && mongodbDb) {
        try {
          const resultsCollection = mongodbDb.collection('results');
          await resultsCollection.insertOne({
            userId: req.userId,
            type: originalText ? 'memory-test' : 'audio',
            input: req.file.originalname || 'audio_file',
            transcription: responseData.transcription.substring(0, 1000), // Store first 1000 chars
            prediction: responseData.prediction,
            label: responseData.label,
            confidence: responseData.confidence,
            dementia_probability: responseData.dementia_probability,
            original_text: originalText ? originalText.substring(0, 500) : null,
            hint_text: hintText ? hintText.substring(0, 500) : null,
            createdAt: new Date()
          });
        } catch (dbError) {
          console.error('Failed to save result to database:', dbError);
          // Don't fail the request if DB save fails
        }
      }
      
      return res.json(responseData);
    } catch (pythonError) {
      console.error('Python prediction error:', pythonError.message);
      const errorMessage = pythonError.message || 'Audio prediction failed';
      
      // Return structured error response
      return res.status(500).json({ 
        error: errorMessage,
        prediction: 'Error',
        label: null,
        confidence: null,
        transcription: '',
        validation_issues: [errorMessage],
        features: {}
      });
    }
  } catch (error) {
    console.error('Error in /predict/audio:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (uploadedFile && fs.existsSync(uploadedFile)) {
      fs.unlink(uploadedFile, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    }
  }
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║   Dementia Detection Backend          ║');
  console.log('║   Express.js Server Running           ║');
  console.log('╠═══════════════════════════════════════╣');
  console.log(`║ 🚀 Server: http://0.0.0.0:${PORT}             ║`);
  console.log('║ 📝 Text Endpoint: POST /predict/text   ║');
  console.log('║ 🎤 Audio Endpoint: POST /predict/audio ║');
  console.log('║ 💚 Health Check: GET /health           ║');
  console.log('╚═══════════════════════════════════════╝\n');
});
