import React, { useState } from 'react';
import './App.css';
import AudioAnalysis from './components/AudioAnalysis';
import ResultsDisplay from './components/ResultsDisplay';

function App() {
  const [activeTab, setActiveTab] = useState('audio');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌿 Maitri Dementia Assessment</h1>
        <p>Compassionate speech analysis for supportive screening</p>
      </header>

      <div className="container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'audio' ? 'active' : ''}`}
            onClick={() => setActiveTab('audio')}
          >
            🎤 Audio Analysis
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'audio' && (
            <AudioAnalysis
              onResults={setResults}
              onLoading={setLoading}
              onError={setError}
            />
          )}
        </div>

        {error && (
          <div className="error-container">
            <div className="error-message">
              ❌ Error: {error}
            </div>
          </div>
        )}

        {loading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Analyzing...</p>
          </div>
        )}

        {results && !loading && (
          <ResultsDisplay results={results} />
        )}
      </div>

      <footer className="app-footer">
        <p>🌱 Maitri — mindful, non-diagnostic support for cognitive screening.</p>
        <p style={{ opacity: 0.85 }}>Always consult a healthcare professional for medical advice.</p>
      </footer>
    </div>
  );
}

export default App;
