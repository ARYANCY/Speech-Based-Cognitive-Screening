import React, { useState } from 'react';
import apiService from '../services/apiService';
import './TextAnalysis.css';

function TextAnalysis({ onResults, onLoading, onError }) {
  const [text, setText] = useState('');

  const handleAnalyze = async () => {
    if (!text.trim()) {
      onError('Please enter some text to analyze');
      return;
    }

    onLoading(true);
    onError(null);

    try {
      const result = await apiService.predictText(text);
      onResults({
        type: 'text',
        input: text,
        prediction: result.prediction,
        confidence: result.confidence,
        validationIssues: result.validation_issues || [],
      });
    } catch (error) {
      onError(error.message);
      onResults(null);
    } finally {
      onLoading(false);
    }
  };

  const handleClear = () => {
    setText('');
    onResults(null);
    onError(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleAnalyze();
    }
  };

  return (
    <div className="text-analysis">
      <div className="input-group">
        <label htmlFor="text-input">Enter text to analyze:</label>
        <textarea
          id="text-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type or paste the text you want to analyze... (Ctrl+Enter to analyze)"
          rows="6"
        />
        <div className="char-count">
          Characters: {text.length} | Words: {text.trim().split(/\s+/).filter(w => w).length}
        </div>
      </div>

      <div className="button-group">
        <button
          className="btn btn-primary"
          onClick={handleAnalyze}
          disabled={!text.trim()}
        >
          📊 Analyze Text
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleClear}
          disabled={!text.trim()}
        >
          🗑️ Clear
        </button>
      </div>

      <div className="info-box">
        <strong>ℹ️ Requirements:</strong>
        <ul>
          <li>Minimum 3 words</li>
          <li>Minimum 10 characters</li>
          <li>Use natural speech patterns for better accuracy</li>
        </ul>
      </div>
    </div>
  );
}

export default TextAnalysis;
