const Session = require('../models/Session');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

exports.startSession = async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const session_id = `sess_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newSession = new Session({ session_id, user_id });
    await newSession.save();

    res.status(201).json({ message: 'Session started successfully', session: newSession });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateInterview = async (req, res) => {
  try {
    const { id } = req.params;
    // Expected to receive either raw text, or audio file logic here
    // If VAPI handles it, might just receive transcript
    const { transcript, audio_path } = req.body;
    
    // Simulate Whisper Integration if needed, or assume transcript is provided by VAPI
    // Let's assume frontend or Vapi sends transcript here for simplicity of the pipeline unless we need to call whisper
    let finalTranscript = transcript || "";

    const session = await Session.findOne({ session_id: id });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    session.interview = {
      ...session.interview,
      transcript: finalTranscript,
      audio_path: audio_path || session.interview.audio_path
    };
    await session.save();

    res.status(200).json({ message: 'Interview updated', session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateGame = async (req, res) => {
  try {
    const { id } = req.params;
    const { scores, raw_logs } = req.body;

    const session = await Session.findOne({ session_id: id });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    session.game = { scores, raw_logs };
    await session.save();

    res.status(200).json({ message: 'Game data updated', session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateEmotion = async (req, res) => {
  try {
    const { id } = req.params;
    const { dominant_emotions, confusion_index, stability_score } = req.body;

    const session = await Session.findOne({ session_id: id });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    session.emotion = { dominant_emotions, confusion_index, stability_score };
    await session.save();

    res.status(200).json({ message: 'Emotion data updated', session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.completeSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await Session.findOne({ session_id: id });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Assuming ML Python service runs on port 8000
    try {
      // Create a payload for ML inference
      const payload = {
        session_id: session.session_id,
        interview_transcript: session.interview.transcript,
        game_scores: session.game.scores,
        emotion_data: session.emotion
      };
      
      const mlResponse = await axios.post('http://localhost:8000/predict', payload);
      
      session.prediction = mlResponse.data;
      await session.save();
      
      res.status(200).json({ message: 'Session completed and analyzed', prediction: mlResponse.data });
    } catch (mlErr) {
      console.error('ML API Error:', mlErr.message);
      res.status(500).json({ error: 'Failed to communicate with ML service' });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = await Session.find({ user_id: userId }).sort({ timestamp: -1 });
    res.status(200).json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
