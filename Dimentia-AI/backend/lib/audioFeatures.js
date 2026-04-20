const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const { Matrix } = require('ml-matrix');

// Set ffmpeg path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
} else {
  console.warn('ffmpeg-static not found. Ensure FFmpeg is installed and in PATH.');
}

const FFMPEG_TIMEOUT = 60000; // 60 seconds timeout for audio processing
const TEMP_DIR = path.join(__dirname, '../temp');

/**
 * Ensure temp directory exists
 */
function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

/**
 * Load audio file and convert to mono 16kHz WAV.
 * 
 * @param {string} audioPath - Path to the audio file
 * @param {number} targetSampleRate - Target sample rate (default: 16000)
 * @returns {Promise<Object>} Object with samples (Float32Array) and sampleRate
 * @throws {Error} If file doesn't exist or processing fails
 */
function loadAudio(audioPath, targetSampleRate = 16000) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(audioPath)) {
      return reject(new Error(`Audio file not found: ${audioPath}`));
    }
    
    ensureTempDir();
    const tempWavPath = path.join(TEMP_DIR, `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.wav`);
    
    let timeoutId = null;
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (fs.existsSync(tempWavPath)) {
        fs.unlink(tempWavPath, (err) => {
          if (err) console.error(`Failed to delete temp audio file ${tempWavPath}:`, err);
        });
      }
    };
    
    // Set timeout
    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Audio processing timed out after ${FFMPEG_TIMEOUT / 1000}s`));
    }, FFMPEG_TIMEOUT);
    
    const ffmpegProcess = ffmpeg(audioPath)
      .audioFrequency(targetSampleRate)
      .audioChannels(1)
      .audioCodec('pcm_s16le')
      .format('wav')
      .on('end', () => {
        clearTimeout(timeoutId);
        try {
          if (!fs.existsSync(tempWavPath)) {
            return reject(new Error('FFmpeg completed but output file not found'));
          }
          
          const buffer = fs.readFileSync(tempWavPath);
          const samples = parseWavBuffer(buffer);
          
          // Cleanup temp file
          fs.unlinkSync(tempWavPath);
          
          if (samples.length === 0) {
            return reject(new Error('Audio file appears to be empty or invalid'));
          }
          
          resolve({
            samples: samples,
            sampleRate: targetSampleRate
          });
        } catch (err) {
          cleanup();
          reject(new Error(`Failed to parse audio: ${err.message}`));
        }
      })
      .on('error', (err) => {
        cleanup();
        reject(new Error(`FFmpeg error: ${err.message}`));
      })
      .save(tempWavPath);
    
    // Handle process kill on timeout
    if (timeoutId) {
      setTimeout(() => {
        if (ffmpegProcess && ffmpegProcess.ffmpegProc) {
          try {
            ffmpegProcess.kill('SIGTERM');
          } catch (killErr) {
            // Ignore kill errors
          }
        }
      }, FFMPEG_TIMEOUT);
    }
  });
}

/**
 * Parse WAV file buffer to Float32Array
 */
function parseWavBuffer(buffer) {
  if (!buffer || buffer.length < 44) {
    throw new Error('Invalid WAV file: file too small or corrupted');
  }
  
  const dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  
  // Check for RIFF header
  if (buffer.length < 4) {
    throw new Error('Invalid WAV file: missing RIFF header');
  }
  
  const riff = String.fromCharCode(...buffer.slice(0, 4));
  if (riff !== 'RIFF') {
    throw new Error('Invalid WAV file: missing RIFF header');
  }
  
  // Find data chunk
  let dataOffset = 44; // Default offset
  let dataSize = 0;
  
  // Search for "data" chunk (safe bounds checking)
  const searchLimit = Math.min(buffer.length - 8, 10000); // Limit search to prevent excessive scanning
  for (let i = 0; i < searchLimit; i++) {
    if (i + 8 > buffer.length) break;
    
    const chunkId = String.fromCharCode(...buffer.slice(i, i + 4));
    if (chunkId === 'data') {
      if (i + 8 > buffer.length) {
        throw new Error('Invalid WAV file: data chunk header incomplete');
      }
      dataOffset = i + 8;
      dataSize = dataView.getUint32(i + 4, true);
      break;
    }
  }
  
  if (dataSize === 0) {
    throw new Error('Invalid WAV file: data chunk not found or empty');
  }
  
  // Validate data size and offset
  if (dataSize < 0 || dataSize > buffer.length - dataOffset) {
    throw new Error('Invalid WAV file: data chunk size exceeds file size');
  }
  
  if (dataSize % 2 !== 0) {
    throw new Error('Invalid WAV file: data chunk size must be even for 16-bit PCM');
  }
  
  // Read audio data (16-bit PCM) with bounds checking
  const numSamples = Math.floor(dataSize / 2);
  if (numSamples === 0) {
    throw new Error('Invalid WAV file: no audio samples found');
  }
  
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const byteOffset = dataOffset + i * 2;
    if (byteOffset + 2 > buffer.length) {
      throw new Error('Invalid WAV file: data chunk extends beyond file');
    }
    const sample = dataView.getInt16(byteOffset, true);
    samples[i] = sample / 32768.0; // Normalize to [-1, 1]
  }
  
  return samples;
}

/**
 * Frame signal into overlapping windows
 */
function frameSignal(signal, frameSize, hopSize) {
  const numFrames = Math.max(0, Math.floor((signal.length - frameSize) / hopSize)) + 1;
  const frames = [];
  
  for (let i = 0; i < numFrames; i++) {
    const start = i * hopSize;
    const end = start + frameSize;
    if (end <= signal.length) {
      frames.push(signal.slice(start, end));
    }
  }
  
  return frames;
}

/**
 * Calculate RMS (Root Mean Square) energy
 */
function calculateRMS(samples) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length + 1e-9);
}

/**
 * Calculate Zero Crossing Rate
 */
function calculateZCR(samples) {
  let crossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i] >= 0) !== (samples[i - 1] >= 0)) {
      crossings++;
    }
  }
  return crossings / samples.length;
}

/**
 * Calculate spectral centroid
 */
function calculateSpectralCentroid(samples, sampleRate) {
  if (!samples || samples.length === 0) {
    return 0;
  }
  
  const fftSize = samples.length;
  if (fftSize < 2) {
    return 0;
  }
  
  const fft = new Array(Math.floor(fftSize / 2));
  
  // Simple FFT (using DFT for small sizes)
  for (let k = 0; k < fftSize / 2; k++) {
    let real = 0;
    let imag = 0;
    
    for (let n = 0; n < fftSize; n++) {
      const angle = -2 * Math.PI * k * n / fftSize;
      real += samples[n] * Math.cos(angle);
      imag += samples[n] * Math.sin(angle);
    }
    
    fft[k] = Math.sqrt(real * real + imag * imag);
  }
  
  // Calculate centroid
  let numerator = 0;
  let denominator = 0;
  
  for (let k = 0; k < fftSize / 2; k++) {
    const freq = (k * sampleRate) / fftSize;
    numerator += freq * fft[k];
    denominator += fft[k];
  }
  
  return denominator > 1e-9 ? numerator / denominator : 0;
}

/**
 * Extract audio features from audio file.
 * 
 * @param {string} audioPath - Path to the audio file
 * @param {number} frameMs - Frame size in milliseconds (default: 30)
 * @param {number} hopMs - Hop size in milliseconds (default: 10)
 * @returns {Promise<Object>} Object containing extracted audio features
 * @throws {Error} If audio processing fails or features cannot be extracted
 */
async function extractAudioFeatures(audioPath, frameMs = 30, hopMs = 10) {
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }
  
  const { samples, sampleRate } = await loadAudio(audioPath);
  
  // Normalize signal
  let maxAbs = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > maxAbs) maxAbs = abs;
  }
  
  if (maxAbs > 0) {
    for (let i = 0; i < samples.length; i++) {
      samples[i] /= maxAbs;
    }
  }
  
  const durationSec = samples.length / sampleRate;
  if (durationSec === 0) {
    throw new Error('Empty audio or zero duration');
  }
  
  if (durationSec < 0.1) {
    throw new Error('Audio too short (minimum 0.1 seconds required)');
  }
  
  const frameSize = Math.floor(frameMs * sampleRate / 1000);
  const hopSize = Math.floor(hopMs * sampleRate / 1000);
  
  if (frameSize <= 0 || hopSize <= 0) {
    throw new Error('Invalid frame or hop size configuration');
  }
  
  const frames = frameSignal(samples, frameSize, hopSize);
  if (frames.length === 0) {
    throw new Error('Audio too short for feature extraction');
  }
  
  // Calculate RMS energy per frame
  const rmsValues = frames.map(frame => calculateRMS(frame));
  if (rmsValues.length === 0) {
    throw new Error('No frames available for RMS calculation');
  }
  const rmsMean = rmsValues.reduce((a, b) => a + b, 0) / rmsValues.length;
  const rmsVariance = rmsValues.reduce((sum, val) => sum + Math.pow(val - rmsMean, 2), 0) / rmsValues.length;
  const rmsStd = Math.sqrt(Math.max(0, rmsVariance));
  
  // Calculate Zero Crossing Rate per frame
  const zcrValues = frames.map(frame => calculateZCR(frame));
  if (zcrValues.length === 0) {
    throw new Error('No frames available for ZCR calculation');
  }
  const zcrMean = zcrValues.reduce((a, b) => a + b, 0) / zcrValues.length;
  const zcrVariance = zcrValues.reduce((sum, val) => sum + Math.pow(val - zcrMean, 2), 0) / zcrValues.length;
  const zcrStd = Math.sqrt(Math.max(0, zcrVariance));
  
  // Voice activity detection
  const sortedRMS = rmsValues.slice().sort((a, b) => a - b);
  const medianRMS = sortedRMS.length > 0 ? sortedRMS[Math.floor(sortedRMS.length / 2)] : 0;
  const energyThreshold = medianRMS + 0.5 * rmsStd;
  const speechFrames = rmsValues.map(rms => rms >= energyThreshold);
  
  const speechFrameCount = speechFrames.filter(v => v).length;
  const speechRatio = speechFrames.length > 0 ? speechFrameCount / speechFrames.length : 0;
  const pauseRatio = Math.max(0, 1.0 - speechRatio);
  
  // Pause detection
  const silentRuns = [];
  let current = 0;
  for (const isSpeech of speechFrames) {
    if (!isSpeech) {
      current++;
    } else if (current > 0) {
      silentRuns.push(current);
      current = 0;
    }
  }
  if (current > 0) {
    silentRuns.push(current);
  }
  
  let pauseCount = 0;
  let pauseMean = 0;
  let pauseMax = 0;
  
  if (silentRuns.length > 0) {
    const pauseDurationsSec = silentRuns.map(run => (run * hopSize) / sampleRate).filter(d => d > 0);
    pauseCount = pauseDurationsSec.length;
    if (pauseDurationsSec.length > 0) {
      pauseMean = pauseDurationsSec.reduce((a, b) => a + b, 0) / pauseDurationsSec.length;
      pauseMax = Math.max(...pauseDurationsSec);
    }
  }
  
  const pauseRatePerSec = durationSec > 0 ? pauseCount / durationSec : 0;
  const speechActivityPerSec = durationSec > 0 
    ? (speechFrames.filter(v => v).length * hopSize / sampleRate) / durationSec 
    : 0;
  
  // Spectral centroid
  const centroidValues = frames.map(frame => calculateSpectralCentroid(frame, sampleRate));
  if (centroidValues.length === 0) {
    throw new Error('No frames available for spectral centroid calculation');
  }
  const centroidMean = centroidValues.reduce((a, b) => a + b, 0) / centroidValues.length;
  const centroidVariance = centroidValues.reduce((sum, val) => sum + Math.pow(val - centroidMean, 2), 0) / centroidValues.length;
  const centroidStd = Math.sqrt(Math.max(0, centroidVariance));
  
  return {
    duration_sec: durationSec,
    rms_mean: rmsMean,
    rms_std: rmsStd,
    zcr_mean: zcrMean,
    zcr_std: zcrStd,
    speech_ratio: speechRatio,
    pause_ratio: pauseRatio,
    pause_count: pauseCount,
    pause_rate_per_sec: pauseRatePerSec,
    pause_mean_sec: pauseMean,
    pause_max_sec: pauseMax,
    speech_activity_per_sec: speechActivityPerSec,
    centroid_mean: centroidMean,
    centroid_std: centroidStd,
  };
}

module.exports = {
  extractAudioFeatures,
  loadAudio
};

