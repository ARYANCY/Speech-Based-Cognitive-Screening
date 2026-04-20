import React from 'react';
import './StatsPanel.css';
import { StatsDistributionChart, HistoryTrendsChart } from './Charts';

function StatsPanel({ history, onClose }) {
  const calculateStats = () => {
    if (history.length === 0) {
      return {
        total: 0,
        healthy: 0,
        mci: 0,
        moderate: 0,
        severe: 0,
        inconclusive: 0,
        avgConfidence: 0
      };
    }

    const stats = {
      total: history.length,
      healthy: 0,
      mci: 0,
      moderate: 0,
      severe: 0,
      inconclusive: 0,
      confidences: []
    };

    history.forEach(item => {
      const pred = item.prediction;
      // Handle both string and numeric predictions, and various formats
      const predStr = String(pred || '').trim();
      const predLower = predStr.toLowerCase();
      
      // Check numeric label first (from backend)
      const label = item.label;
      if (label !== null && label !== undefined) {
        if (label === 0) stats.healthy++;
        else if (label === 1) stats.mci++;
        else if (label === 2) stats.moderate++;
        else if (label === 3) stats.severe++;
        else stats.inconclusive++;
      } else {
        // Fallback to string matching
        if (pred === 'Healthy' || pred === 0 || predLower === 'healthy' || predStr === '0') {
          stats.healthy++;
        } else if (pred === 'MCI' || pred === 1 || predLower === 'mci' || predStr === '1') {
          stats.mci++;
        } else if (pred === 'Moderate' || pred === 2 || predLower === 'moderate' || predStr === '2') {
          stats.moderate++;
        } else if (pred === 'Severe' || pred === 3 || predLower === 'severe' || predStr === '3') {
          stats.severe++;
        } else if (pred === 'Inconclusive' || predLower === 'inconclusive' || pred === null || pred === undefined || pred === 'Error') {
          stats.inconclusive++;
        } else {
          // Handle "Dementia Risk Detected" or other variations
          if (predLower.includes('dementia') || predLower.includes('risk') || predLower.includes('detected')) {
            // Default to MCI if it's a dementia-related prediction but not specific
            stats.mci++;
          } else {
            // Unknown prediction type, count as inconclusive
            stats.inconclusive++;
          }
        }
      }

      if (item.confidence && typeof item.confidence === 'number' && !isNaN(item.confidence)) {
        stats.confidences.push(item.confidence);
      }
    });

    stats.avgConfidence = stats.confidences.length > 0
      ? stats.confidences.reduce((a, b) => a + b, 0) / stats.confidences.length
      : 0;

    return stats;
  };

  const stats = calculateStats();

  return (
    <div className="stats-panel">
      <div className="stats-header">
        <h2>📈 Statistics</h2>
        <button className="btn-close" onClick={onClose}>×</button>
      </div>

      <div className="stats-content">
        {stats.total === 0 ? (
          <div className="stats-empty">
            <div className="empty-icon">📊</div>
            <p>No statistics available</p>
            <p className="empty-subtext">Perform some analyses to see statistics</p>
          </div>
        ) : (
          <>
            <div className="stats-overview">
              <div className="stat-card">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total Analyses</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{(stats.avgConfidence * 100).toFixed(1)}%</div>
                <div className="stat-label">Avg Confidence</div>
              </div>
            </div>

            <div className="stats-breakdown">
              <h3>Prediction Distribution</h3>
              <StatsDistributionChart stats={stats} />
            </div>

            {history.length > 1 && (
              <div className="stats-trends">
                <h3>Dementia Probability Trend</h3>
                <HistoryTrendsChart history={history} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default StatsPanel;

