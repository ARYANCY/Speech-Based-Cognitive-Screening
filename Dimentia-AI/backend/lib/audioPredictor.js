const { extractAudioFeatures } = require('./audioFeatures');
const { predictWithML } = require('./mlPredictor');
const { transcribeWithWhisper } = require('./whisperTranscribe');

/**
 * Predict dementia from audio file by extracting features and running ML prediction.
 * Also transcribes audio with Whisper and detects filler words.
 * 
 * @param {string} audioPath - Path to the audio file
 * @param {Object} options - Optional configuration { expectedText, useWhisper }
 * @returns {Promise<Object>} Prediction result with label, confidence, features, transcription, and filler words
 * @throws {Error} If audio processing or prediction fails
 */
async function predictAudio(audioPath, options = {}) {
  if (!audioPath || typeof audioPath !== 'string') {
    throw new Error('Invalid audio path: path must be a non-empty string');
  }
  
  const { expectedText = null, useWhisper = true } = options;
  
  // Extract audio features (Node.js)
  const features = await extractAudioFeatures(audioPath);
  
  // Validate features before ML prediction
  if (!features || typeof features !== 'object') {
    throw new Error('Failed to extract audio features: invalid feature object');
  }
  
  // Transcribe with Whisper if enabled
  let whisperResult = null;
  if (useWhisper) {
    try {
      whisperResult = await transcribeWithWhisper(audioPath, expectedText);
      
      // Validate transcription similarity if expected text provided
      if (expectedText && whisperResult.text_similarity !== null) {
        if (!whisperResult.is_valid) {
          throw new Error(
            `Transcription does not match expected text. Similarity: ${(whisperResult.text_similarity * 100).toFixed(1)}% (required: 60%). ` +
            `Please ensure the audio matches the provided paragraph.`
          );
        }
      }
    } catch (whisperError) {
      // If Whisper fails but expected text validation fails, throw error
      if (expectedText && whisperError.message.includes('does not match')) {
        throw whisperError;
      }
      // Otherwise, log warning but continue with prediction
      console.warn(`Whisper transcription failed: ${whisperError.message}. Continuing without transcription.`);
    }
  }
  
  // Predict with ML model (Python bridge for scikit-learn)
  const mlResult = await predictWithML(features);
  
  // Validate ML result
  if (!mlResult || typeof mlResult !== 'object') {
    throw new Error('ML prediction returned invalid result');
  }
  
  if (mlResult.prediction === undefined || mlResult.confidence === undefined) {
    throw new Error('ML prediction result missing required fields');
  }
  
  const result = {
    prediction: mlResult.prediction,
    label: mlResult.label,
    confidence: mlResult.confidence,
    features: mlResult.features || features,
    transcription: whisperResult?.transcription || null,
    filler_words: whisperResult?.filler_words || [],
    filler_count: whisperResult?.filler_count || 0,
    filler_words_list: whisperResult?.filler_words_list || [],
    total_words: whisperResult?.total_words || 0,
    text_similarity: whisperResult?.text_similarity || null,
    is_valid: whisperResult?.is_valid !== false
  };
  
  return result;
}

module.exports = {
  predictAudio
};

