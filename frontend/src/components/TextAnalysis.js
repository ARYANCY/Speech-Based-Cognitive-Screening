import React, { useState } from 'react';
import apiService from '../services/apiService';
import './TextAnalysis.css';

function TextAnalysis({ onResults, onLoading, onError }) {
  const [text, setText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const handleTextChange = (e) => {
    const value = e.target.value;
    setText(value);
    const words = value.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
    setCharCount(value.length);
  };

  const handleAnalyze = async () => {
    if (!text.trim()) {
      onError('Please enter some text to analyze');
      return;
    }

    if (wordCount < 3) {
      onError('Please enter at least 3 words for accurate analysis');
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
        flagReason: result.flag_reason || null,
        features: result.features || {}
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
    setWordCount(0);
    setCharCount(0);
    onResults(null);
    onError(null);
  };

  const handlePasteExample = () => {
    const example = "I went to the grocery store yesterday and bought fresh vegetables including tomatoes, lettuce, and carrots. The weather was beautiful so I decided to walk there instead of driving. When I returned home, I prepared a healthy salad for dinner.";
    setText(example);
    handleTextChange({ target: { value: example } });
  };

  return (
    <div className="text-analysis">
      <div className="analysis-header">
        <h2>📝 Text Analysis</h2>
        <p className="subtitle">Enter or paste text for dementia risk assessment</p>
      </div>

      <div className="input-section">
        <div className="input-header">
          <label htmlFor="text-input">Enter Text</label>
          <div className="input-stats">
            <span className="stat-item">
              <span className="stat-label">Words:</span>
              <span className="stat-value">{wordCount}</span>
            </span>
            <span className="stat-item">
              <span className="stat-label">Characters:</span>
              <span className="stat-value">{charCount}</span>
            </span>
          </div>
        </div>
        
        <textarea
          id="text-input"
          className="text-input"
          value={text}
          onChange={handleTextChange}
          placeholder="Enter or paste the text you want to analyze here..."
          rows={8}
        />

        <div className="input-actions">
          <button className="btn btn-secondary" onClick={handlePasteExample}>
            📋 Paste Example
          </button>
          <div className="input-actions-right">
            <button className="btn btn-secondary" onClick={handleClear} disabled={!text}>
              🗑️ Clear
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleAnalyze}
              disabled={!text || wordCount < 3}
            >
              🔍 Analyze Text
            </button>
          </div>
        </div>
      </div>

      <div className="info-section">
        <div className="info-card">
          <h3>ℹ️ Guidelines</h3>
          <ul>
            <li>Minimum 3 words required for analysis</li>
            <li>Longer text provides more accurate results</li>
            <li>Natural speech patterns work best</li>
            <li>Can analyze written text or transcribed speech</li>
          </ul>
        </div>

        <div className="info-card">
          <h3>💡 Tips</h3>
          <ul>
            <li>Use complete sentences for better accuracy</li>
            <li>Include natural conversation patterns</li>
            <li>Avoid very short or fragmented text</li>
            <li>50+ words recommended for optimal results</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default TextAnalysis;
