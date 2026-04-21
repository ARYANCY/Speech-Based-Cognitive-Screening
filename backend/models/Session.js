const mongoose = require('mongoose');

const sessionSchema = mongoose.Schema(
  {
    session_id: { type: String, required: true, unique: true },
    user_id: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    interview: {
      audio_path: { type: String, default: null },
      transcript: { type: String, default: null },
      features: { type: Object, default: {} },
    },
    game: {
      scores: { type: Object, default: {} },
      raw_logs: { type: Object, default: {} },
    },
    emotion: {
      dominant_emotions: [{ type: String }],
      confusion_index: { type: Number, default: 0 },
      stability_score: { type: Number, default: 0 },
    },
    final_features: [{ type: Number }],
    prediction: {
      risk_score: { type: Number, default: null },
      label: { type: String, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);
