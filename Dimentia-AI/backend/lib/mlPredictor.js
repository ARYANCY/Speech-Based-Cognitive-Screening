const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const PYTHON_TIMEOUT = 30000; // 30 seconds timeout
const FEATURE_COLS = [
  'duration_sec',
  'rms_mean',
  'rms_std',
  'zcr_mean',
  'zcr_std',
  'speech_ratio',
  'pause_ratio',
  'pause_count',
  'pause_rate_per_sec',
  'pause_mean_sec',
  'pause_max_sec',
  'speech_activity_per_sec',
  'centroid_mean',
  'centroid_std',
];
const LABEL_MAP = { 0: 'Healthy', 1: 'Dementia' };

/**
 * Load ML models and make predictions using Python bridge for scikit-learn models.
 * 
 * @param {Object} features - Audio features object
 * @returns {Promise<Object>} Prediction result with label, confidence, and features
 * @throws {Error} If models are missing, features are invalid, or prediction fails
 */
function predictWithML(features) {
  return new Promise((resolve, reject) => {
    const modelsDir = path.join(__dirname, '../../models');
    const scalerPath = path.join(modelsDir, 'audio_scaler.joblib');
    const modelPath = path.join(modelsDir, 'audio_classifier.joblib');
    
    // Validate models exist
    if (!fs.existsSync(scalerPath) || !fs.existsSync(modelPath)) {
      return reject(new Error(
        `ML models not found. Expected:\n` +
        `  ${scalerPath}\n` +
        `  ${modelPath}\n` +
        `Please train models first.`
      ));
    }
    
    // Validate features
    const missingFeatures = FEATURE_COLS.filter(col => features[col] === undefined || features[col] === null);
    if (missingFeatures.length > 0) {
      return reject(new Error(
        `Missing required features: ${missingFeatures.join(', ')}`
      ));
    }
    
    // Create temporary directory for scripts if it doesn't exist
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempScriptPath = path.join(tempDir, `predict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.py`);
    const featuresJson = JSON.stringify(features);
    
    // Escape JSON for Python (handle special characters safely)
    // Use triple quotes to avoid escaping issues
    const escapedJson = featuresJson.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    const modelsDirEscaped = modelsDir.replace(/\\/g, '/').replace(/'/g, "\\'").replace(/"/g, '\\"');
    
    const pythonScript = `import json
import sys
import os
import traceback
import joblib
import numpy as np

FEATURE_COLS = ${JSON.stringify(FEATURE_COLS)}
LABEL_MAP = ${JSON.stringify(LABEL_MAP)}

try:
    features_json = '''${escapedJson}'''
    features = json.loads(features_json)
    
    models_dir = r"${modelsDirEscaped}"
    scaler_path = os.path.join(models_dir, 'audio_scaler.joblib')
    model_path = os.path.join(models_dir, 'audio_classifier.joblib')
    
    if not os.path.exists(scaler_path) or not os.path.exists(model_path):
        raise FileNotFoundError(f"Models not found: {scaler_path}, {model_path}")
    
    scaler = joblib.load(scaler_path)
    model = joblib.load(model_path)
    
    # Prepare feature array
    arr = np.array([[features.get(c, 0.0) for c in FEATURE_COLS]])
    arr_scaled = scaler.transform(arr)
    
    # Predict
    prob = model.predict_proba(arr_scaled)[0]
    pred = int(np.argmax(prob))
    confidence = float(np.max(prob))
    
    result = {
        "prediction": LABEL_MAP.get(pred, str(pred)),
        "label": pred,
        "confidence": round(confidence, 4),
        "features": features
    }
    
    print(json.dumps(result))
except Exception as e:
    error_msg = {"error": str(e), "traceback": traceback.format_exc()}
    print(json.dumps(error_msg), file=sys.stderr)
    sys.exit(1)
`;
    
    try {
      fs.writeFileSync(tempScriptPath, pythonScript, 'utf8');
    } catch (writeErr) {
      return reject(new Error(`Failed to create prediction script: ${writeErr.message}`));
    }
    
    const pythonCmd = os.platform() === 'win32' ? 'py' : 'python3';
    const python = spawn(pythonCmd, [tempScriptPath], {
      timeout: PYTHON_TIMEOUT,
      cwd: path.dirname(tempScriptPath),
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });
    
    let stdout = '';
    let stderr = '';
    let timeoutId = null;
    
    // Set timeout
    timeoutId = setTimeout(() => {
      python.kill('SIGTERM');
      cleanup();
      reject(new Error(`ML prediction timed out after ${PYTHON_TIMEOUT / 1000}s`));
    }, PYTHON_TIMEOUT);
    
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (fs.existsSync(tempScriptPath)) {
        try {
          fs.unlinkSync(tempScriptPath);
        } catch (unlinkErr) {
          console.error(`Failed to delete temp script ${tempScriptPath}:`, unlinkErr);
        }
      }
    };
    
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    python.on('close', (code) => {
      cleanup();
      
      if (code !== 0) {
        let errorMsg = `ML prediction failed: ${stderr || 'Unknown error'}`;
        try {
          const errorJson = JSON.parse(stderr);
          if (errorJson.error) {
            errorMsg = `ML prediction failed: ${errorJson.error}`;
          }
        } catch (e) {
          // Not JSON, use raw stderr
        }
        return reject(new Error(errorMsg));
      }
      
      try {
        const result = JSON.parse(stdout);
        if (result.error) {
          return reject(new Error(`ML prediction error: ${result.error}`));
        }
        resolve(result);
      } catch (parseErr) {
        reject(new Error(`Failed to parse ML prediction output: ${stdout.substring(0, 200)}`));
      }
    });
    
    python.on('error', (err) => {
      cleanup();
      reject(new Error(`Failed to start Python process: ${err.message}. Make sure Python is installed and accessible.`));
    });
  });
}

module.exports = {
  predictWithML
};

