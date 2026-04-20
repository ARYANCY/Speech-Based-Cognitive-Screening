const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const WHISPER_TIMEOUT = 120000; // 2 minutes timeout for Whisper (can be slow)
const WHISPER_MODEL = process.env.WHISPER_MODEL || 'base'; // tiny, base, small, medium, large

/**
 * Transcribe audio using OpenAI Whisper and detect filler words.
 * 
 * @param {string} audioPath - Path to the audio file
 * @param {string} expectedText - Optional expected text for similarity validation
 * @param {string} modelName - Whisper model name (default: 'base')
 * @returns {Promise<Object>} Transcription result with filler words and similarity
 * @throws {Error} If transcription fails
 */
function transcribeWithWhisper(audioPath, expectedText = null, modelName = WHISPER_MODEL) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(audioPath)) {
      return reject(new Error(`Audio file not found: ${audioPath}`));
    }
    
    const scriptPath = path.join(__dirname, '../../src/whisper_transcribe.py');
    
    if (!fs.existsSync(scriptPath)) {
      return reject(new Error(`Whisper transcription script not found: ${scriptPath}`));
    }
    
    const args = [scriptPath, audioPath, modelName];
    if (expectedText) {
      args.push(expectedText);
    }
    
    const pythonCmd = os.platform() === 'win32' ? 'py' : 'python3';
    const python = spawn(pythonCmd, args, {
      timeout: WHISPER_TIMEOUT,
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });
    
    let stdout = '';
    let stderr = '';
    let timeoutId = null;
    
    // Set timeout
    timeoutId = setTimeout(() => {
      python.kill('SIGTERM');
      cleanup();
      reject(new Error(`Whisper transcription timed out after ${WHISPER_TIMEOUT / 1000}s`));
    }, WHISPER_TIMEOUT);
    
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
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
        let errorMsg = `Whisper transcription failed: ${stderr || 'Unknown error'}`;
        try {
          const errorJson = JSON.parse(stderr);
          if (errorJson.error) {
            errorMsg = `Whisper transcription failed: ${errorJson.error}`;
          }
        } catch (e) {
          // Not JSON, use raw stderr
        }
        return reject(new Error(errorMsg));
      }
      
      try {
        const result = JSON.parse(stdout);
        if (result.error) {
          return reject(new Error(`Whisper transcription error: ${result.error}`));
        }
        resolve(result);
      } catch (parseErr) {
        reject(new Error(`Failed to parse Whisper output: ${stdout.substring(0, 200)}`));
      }
    });
    
    python.on('error', (err) => {
      cleanup();
      reject(new Error(`Failed to start Python for Whisper: ${err.message}. Make sure Python and openai-whisper are installed.`));
    });
  });
}

module.exports = {
  transcribeWithWhisper
};

