import React, { useState, useEffect } from 'react';
import './App.css';
import AudioAnalysis from './components/AudioAnalysis';
import TextAnalysis from './components/TextAnalysis';
import ResultsDisplay from './components/ResultsDisplay';
import HistoryPanel from './components/HistoryPanel';
import StatsPanel from './components/StatsPanel';
import Auth from './components/Auth';
import ResultsSummary from './components/ResultsSummary';
import apiService from './services/apiService';

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('audio');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = await apiService.getCurrentUser();
      if (userData && userData.user) {
        setUser(userData.user);
      }
    } catch (err) {
      // User not authenticated
      setUser(null);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setError(null);
  };

  const handleLogout = () => {
    apiService.logout();
    setUser(null);
    setResults(null);
    setHistory([]);
    setShowSummary(false);
  };

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('dementiaAnalysisHistory');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Error loading history:', e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('dementiaAnalysisHistory', JSON.stringify(history));
    }
  }, [history]);

  const handleResults = (newResults) => {
    setResults(newResults);
    if (newResults) {
      const historyItem = {
        ...newResults,
        timestamp: new Date().toISOString(),
        id: Date.now()
      };
      setHistory(prev => [historyItem, ...prev].slice(0, 50)); // Keep last 50
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('dementiaAnalysisHistory');
  };

  const clearError = () => {
    setError(null);
  };

  // Show auth if user not logged in
  if (!user) {
    return (
      <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
        <Auth onLogin={handleLogin} onError={setError} />
        {error && (
          <div className="error-container" style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
            <div className="error-header">
              <span className="error-icon">⚠️</span>
              <span className="error-title">Error</span>
              <button className="error-close" onClick={clearError}>×</button>
            </div>
            <div className="error-message">{error}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
      <header className="app-header">
        <div className="header-content">
          <div className="header-main">
            <h1>
              <span className="icon">🧠</span>
              Dementia Detection System
            </h1>
            <p className="subtitle">AI-powered speech pattern analysis for early detection</p>
          </div>
          <div className="header-actions">
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-email">{user.email}</span>
            </div>
            <button 
              className="icon-btn" 
              onClick={() => setShowSummary(!showSummary)}
              title="Performance Summary"
            >
              📋
            </button>
            <button 
              className="icon-btn" 
              onClick={() => setShowHistory(!showHistory)}
              title="View History"
            >
              📊
            </button>
            <button 
              className="icon-btn" 
              onClick={() => setShowStats(!showStats)}
              title="Statistics"
            >
              📈
            </button>
            <button 
              className="icon-btn logout-btn" 
              onClick={handleLogout}
              title="Logout"
            >
              🚪
            </button>
            <button 
              className="icon-btn" 
              onClick={() => setDarkMode(!darkMode)}
              title="Toggle Dark Mode"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'audio' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('audio');
              setError(null);
            }}
          >
            <span className="tab-icon">🎤</span>
            <span className="tab-text">Audio Analysis</span>
          </button>
          <button
            className={`tab ${activeTab === 'text' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('text');
              setError(null);
            }}
          >
            <span className="tab-icon">📝</span>
            <span className="tab-text">Text Analysis</span>
          </button>
        </div>

        <div className="main-content">
          <div className="content-left">
            <div className="tab-content">
              {activeTab === 'audio' && (
                <AudioAnalysis
                  onResults={handleResults}
                  onLoading={setLoading}
                  onError={setError}
                />
              )}
              {activeTab === 'text' && (
                <TextAnalysis
                  onResults={handleResults}
                  onLoading={setLoading}
                  onError={setError}
                />
              )}
            </div>

            {error && (
              <div className="error-container">
                <div className="error-header">
                  <span className="error-icon">⚠️</span>
                  <span className="error-title">Error</span>
                  <button className="error-close" onClick={clearError}>×</button>
                </div>
                <div className="error-message">{error}</div>
              </div>
            )}

            {loading && (
              <div className="loading-container">
                <div className="loading-spinner">
                  <div className="spinner-ring"></div>
                  <div className="spinner-ring"></div>
                  <div className="spinner-ring"></div>
                </div>
                <p className="loading-text">Analyzing speech patterns...</p>
                <p className="loading-subtext">This may take a few moments</p>
              </div>
            )}

            {results && !loading && (
              <ResultsDisplay 
                results={results}
                onClose={() => setResults(null)}
              />
            )}
          </div>

          {showHistory && (
            <HistoryPanel 
              history={history}
              onClose={() => setShowHistory(false)}
              onClear={clearHistory}
              onSelect={(item) => {
                setResults(item);
                setShowHistory(false);
              }}
            />
          )}

          {showStats && (
            <StatsPanel 
              history={history}
              onClose={() => setShowStats(false)}
            />
          )}

          {showSummary && (
            <ResultsSummary 
              onClose={() => setShowSummary(false)}
            />
          )}
        </div>
      </div>

      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-section">
            <p className="footer-title">About</p>
            <p>AI-powered dementia detection using advanced speech pattern analysis</p>
          </div>
          <div className="footer-section">
            <p className="footer-title">Technology</p>
            <p>React • Express.js • Python ML • Whisper AI</p>
          </div>
          <div className="footer-section">
            <p className="footer-title">Disclaimer</p>
            <p>For screening purposes only. Consult healthcare professionals for diagnosis.</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2024 Dementia Detection System | Version 2.0</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
