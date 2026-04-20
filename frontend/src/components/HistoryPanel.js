import React from 'react';
import './HistoryPanel.css';

function HistoryPanel({ history, onClose, onClear, onSelect }) {
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getPredictionColor = (prediction) => {
    if (prediction === 'Healthy' || prediction === 0) return 'healthy';
    if (prediction === 'Inconclusive') return 'inconclusive';
    return 'dementia';
  };

  const getPredictionIcon = (prediction) => {
    if (prediction === 'Healthy' || prediction === 0) return '✅';
    if (prediction === 'Inconclusive') return '❓';
    return '⚠️';
  };

  return (
    <div className="history-panel">
      <div className="history-header">
        <h2>📊 Analysis History</h2>
        <div className="history-actions">
          {history.length > 0 && (
            <button className="btn-clear" onClick={onClear}>
              🗑️ Clear
            </button>
          )}
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
      </div>

      <div className="history-content">
        {history.length === 0 ? (
          <div className="history-empty">
            <div className="empty-icon">📭</div>
            <p>No analysis history yet</p>
            <p className="empty-subtext">Your analysis results will appear here</p>
          </div>
        ) : (
          <div className="history-list">
            {history.map((item) => (
              <div 
                key={item.id} 
                className="history-item"
                onClick={() => onSelect(item)}
              >
                <div className="history-item-header">
                  <span className={`prediction-badge ${getPredictionColor(item.prediction)}`}>
                    {getPredictionIcon(item.prediction)} {item.prediction || 'Unknown'}
                  </span>
                  <span className="history-date">{formatDate(item.timestamp)}</span>
                </div>
                <div className="history-item-content">
                  {item.transcription && (
                    <p className="history-transcript">
                      {item.transcription.length > 100 
                        ? `${item.transcription.substring(0, 100)}...` 
                        : item.transcription}
                    </p>
                  )}
                  {item.input && !item.transcription && (
                    <p className="history-transcript">
                      {item.input.length > 100 
                        ? `${item.input.substring(0, 100)}...` 
                        : item.input}
                    </p>
                  )}
                  {item.confidence && (
                    <div className="history-confidence">
                      <span>Confidence: </span>
                      <span className="confidence-value">
                        {(item.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default HistoryPanel;

