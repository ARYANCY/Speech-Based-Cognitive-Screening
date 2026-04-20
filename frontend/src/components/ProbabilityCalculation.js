import React, { useState } from 'react';
import './ProbabilityCalculation.css';

function ProbabilityCalculation({ calculationBreakdown, dementiaProb }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!calculationBreakdown && !dementiaProb) return null;

  // If no breakdown but we have probability, show simple calculation
  if (!calculationBreakdown) {
    return (
      <div className="probability-calculation">
        <div className="calc-header" onClick={() => setIsExpanded(!isExpanded)}>
          <span className="calc-title">📊 Calculation Details</span>
          <span className="calc-toggle">{isExpanded ? '▼' : '▶'}</span>
        </div>
        {isExpanded && (
          <div className="calc-content">
            <div className="calc-step">
              <div className="calc-formula">
                Dementia Probability = 1 - P(Healthy)
              </div>
              <div className="calc-result">
                = {((1 - (1 - dementiaProb)) * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const { 
    base_probability_percent = 0,
    boosts = {},
    total_boost_percent = 0,
    total_boost = 0,
    boost_cap = 0.50,
    final_probability_percent = 0,
    max_probability = 0.95
  } = calculationBreakdown || {};
  
  // Calculate total boost before cap for display
  const totalBoostBeforeCap = total_boost || total_boost_percent / 100;

  return (
    <div className="probability-calculation">
      <div className="calc-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="calc-title">📊 Calculation Details</span>
        <span className="calc-toggle">{isExpanded ? '▼' : '▶'}</span>
      </div>
      {isExpanded && (
        <div className="calc-content">
          <div className="calc-section">
            <h4>Step 1: Base Probability</h4>
            <div className="calc-step">
              <div className="calc-formula">
                Base Dementia Probability = 1 - P(Healthy)
              </div>
              <div className="calc-result">
                = {base_probability_percent}%
              </div>
            </div>
          </div>

          <div className="calc-section">
            <h4>Step 2: Probability Boosts</h4>
            <div className="calc-boosts">
              {boosts.pauses && boosts.pauses.count > 0 && (
                <div className="calc-boost-item">
                  <div className="boost-label">
                    Pauses Boost: {boosts.pauses.count} pauses × {boosts.pauses.rate_per_pause * 100}% per pause
                  </div>
                  <div className="boost-calculation">
                    = min({boosts.pauses.count} × {boosts.pauses.rate_per_pause * 100}%, {boosts.pauses.capped_at * 100}%)
                  </div>
                  <div className="boost-result">
                    = {boosts.pauses.boost_percent}%
                  </div>
                </div>
              )}

              {boosts.fillers_audio && boosts.fillers_audio.count > 0 && (
                <div className="calc-boost-item">
                  <div className="boost-label">
                    Audio Fillers Boost: {boosts.fillers_audio.count} fillers × {boosts.fillers_audio.rate_per_filler * 100}% per filler
                  </div>
                  <div className="boost-calculation">
                    = min({boosts.fillers_audio.count} × {boosts.fillers_audio.rate_per_filler * 100}%, {boosts.fillers_audio.capped_at * 100}%)
                  </div>
                  <div className="boost-result">
                    = {boosts.fillers_audio.boost_percent}%
                  </div>
                </div>
              )}

              {boosts.pause_ratio && boosts.pause_ratio.boost > 0 && (
                <div className="calc-boost-item">
                  <div className="boost-label">
                    Pause Ratio Boost: (Pause Ratio - Threshold) × Multiplier
                  </div>
                  <div className="boost-calculation">
                    = min(({boosts.pause_ratio.value.toFixed(2)} - {boosts.pause_ratio.threshold}) × 60%, {boosts.pause_ratio.capped_at * 100}%)
                  </div>
                  <div className="boost-result">
                    = {boosts.pause_ratio.boost_percent}%
                  </div>
                </div>
              )}

              {boosts.filler_density && boosts.filler_density.boost > 0 && (
                <div className="calc-boost-item">
                  <div className="boost-label">
                    Filler Density Boost: (Filler Density - Threshold) × Multiplier
                  </div>
                  <div className="boost-calculation">
                    = min(({boosts.filler_density.value.toFixed(2)} - {boosts.filler_density.threshold}) × 40%, {boosts.filler_density.capped_at * 100}%)
                  </div>
                  <div className="boost-result">
                    = {boosts.filler_density.boost_percent}%
                  </div>
                </div>
              )}

              {boosts.fillers_text && boosts.fillers_text.count > 0 && (
                <div className="calc-boost-item">
                  <div className="boost-label">
                    Text Fillers Boost: {boosts.fillers_text.count} fillers × {boosts.fillers_text.rate_per_filler * 100}% per filler
                  </div>
                  <div className="boost-calculation">
                    = min({boosts.fillers_text.count} × {boosts.fillers_text.rate_per_filler * 100}%, {boosts.fillers_text.capped_at * 100}%)
                  </div>
                  <div className="boost-result">
                    = {boosts.fillers_text.boost_percent}%
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="calc-section">
            <h4>Step 3: Total Boost</h4>
            <div className="calc-step">
              <div className="calc-formula">
                Total Boost = Sum of all boosts
              </div>
              <div className="calc-calculation">
                = {(boosts.pauses?.boost_percent || 0)}% + {(boosts.fillers_audio?.boost_percent || 0)}% + {(boosts.pause_ratio?.boost_percent || 0)}% + {(boosts.filler_density?.boost_percent || 0)}% + {(boosts.fillers_text?.boost_percent || 0)}%
              </div>
              {totalBoostBeforeCap > boost_cap && (
                <div className="calc-note">
                  (Capped at {boost_cap * 100}% maximum boost)
                </div>
              )}
              <div className="calc-result">
                = {total_boost_percent}%
              </div>
            </div>
          </div>

          <div className="calc-section">
            <h4>Step 4: Final Probability</h4>
            <div className="calc-step">
              <div className="calc-formula">
                Final Dementia Probability = Base Probability + Total Boost
              </div>
              <div className="calc-calculation">
                = {base_probability_percent}% + {total_boost_percent}%
              </div>
              <div className="calc-note">
                (Capped at {max_probability * 100}% maximum)
              </div>
              <div className="calc-result final">
                = {final_probability_percent}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProbabilityCalculation;

