import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import './ResultsSummary.css';

function ResultsSummary({ onClose }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getResultsSummary();
      setSummary(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="results-summary">
        <div className="summary-loading">Loading summary...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-summary">
        <div className="summary-error">Error: {error}</div>
        <button onClick={loadSummary} className="summary-retry-btn">Retry</button>
      </div>
    );
  }

  if (!summary || summary.totalTests === 0) {
    return (
      <div className="results-summary">
        <div className="summary-header">
          <h3>Performance Summary</h3>
          <button onClick={onClose} className="summary-close-btn">×</button>
        </div>
        <div className="summary-empty">
          <p>No analysis results yet.</p>
          <p>Complete your first analysis to see your performance summary.</p>
        </div>
      </div>
    );
  }

  const getPredictionColor = (prediction) => {
    const colors = {
      'Healthy': '#4caf50',
      'MCI': '#ff9800',
      'Moderate': '#ff5722',
      'Severe': '#f44336',
      'Inconclusive': '#9e9e9e',
      'Error': '#f44336'
    };
    return colors[prediction] || '#666';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="results-summary">
      <div className="summary-header">
        <h3>Performance Summary</h3>
        <button onClick={onClose} className="summary-close-btn">×</button>
      </div>

      <div className="summary-content">
        <div className="summary-stats">
          <div className="stat-card">
            <div className="stat-value">{summary.totalTests}</div>
            <div className="stat-label">Total Tests</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {(summary.averageDementiaProbability * 100).toFixed(1)}%
            </div>
            <div className="stat-label">Avg. Dementia Probability</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {(summary.averageConfidence * 100).toFixed(1)}%
            </div>
            <div className="stat-label">Avg. Confidence</div>
          </div>
        </div>

        <div className="summary-trends">
          <h4>Trend</h4>
          <div className="trend-indicators">
            {summary.trends.improving && (
              <span className="trend-badge trend-improving">Improving</span>
            )}
            {summary.trends.stable && (
              <span className="trend-badge trend-stable">Stable</span>
            )}
            {summary.trends.declining && (
              <span className="trend-badge trend-declining">Declining</span>
            )}
          </div>
        </div>

        <div className="summary-predictions">
          <h4>Prediction Distribution</h4>
          <div className="prediction-bars">
            {Object.entries(summary.predictions).map(([pred, count]) => (
              count > 0 && (
                <div key={pred} className="prediction-bar-item">
                  <div className="prediction-label">
                    <span 
                      className="prediction-color-dot"
                      style={{ backgroundColor: getPredictionColor(pred) }}
                    ></span>
                    {pred}
                  </div>
                  <div className="prediction-bar">
                    <div 
                      className="prediction-bar-fill"
                      style={{ 
                        width: `${(count / summary.totalTests) * 100}%`,
                        backgroundColor: getPredictionColor(pred)
                      }}
                    ></div>
                  </div>
                  <div className="prediction-count">{count}</div>
                </div>
              )
            ))}
          </div>
        </div>

        <div className="summary-recent">
          <h4>Last 5 Results</h4>
          <div className="recent-results-list">
            {summary.recentResults.map((result, index) => (
              <div key={result.id || index} className="recent-result-item">
                <div className="recent-result-header">
                  <span 
                    className="recent-result-prediction"
                    style={{ color: getPredictionColor(result.prediction) }}
                  >
                    {result.prediction}
                  </span>
                  <span className="recent-result-date">
                    {formatDate(result.createdAt)}
                  </span>
                </div>
                <div className="recent-result-details">
                  <span>Dementia Probability: {(result.dementiaProbability * 100).toFixed(1)}%</span>
                  <span>Type: {result.type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResultsSummary;

