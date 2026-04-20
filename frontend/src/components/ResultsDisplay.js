import React from 'react';
import './ResultsDisplay.css';
import { ClassProbabilitiesChart, DementiaProbabilityGauge, TimeAnalysisChart, AudioSignalChart } from './Charts';
import ProbabilityCalculation from './ProbabilityCalculation';

function ResultsDisplay({ results, onClose }) {
  if (!results) return null;

  const { 
    prediction, 
    confidence, 
    dementia_probability,  // New field for dementia probability
    validationIssues, 
    transcription,
    flagReason,
    features 
  } = results;

  const isHealthy = prediction === 'Healthy' || prediction === 0;
  // Check for error state: explicit "Error" prediction OR validation issues containing error keywords
  const hasErrorKeywords = validationIssues && validationIssues.some(issue => 
    issue.toLowerCase().includes('failed') || 
    issue.toLowerCase().includes('error') || 
    issue.toLowerCase().includes('ffmpeg') ||
    issue.toLowerCase().includes('not found') ||
    issue.toLowerCase().includes('transcription failed') ||
    issue.toLowerCase().includes('processing error')
  );
  // Error if: explicit "Error" prediction OR validation issues contain error keywords
  const isError = prediction === 'Error' || hasErrorKeywords;
  const isInconclusive = prediction === 'Inconclusive' && !isError;
  
  // Use dementia_probability if available, otherwise fall back to confidence
  const dementiaProb = dementia_probability !== null && dementia_probability !== undefined 
    ? dementia_probability 
    : confidence;
  const hasDementiaProb = dementiaProb !== null && dementiaProb !== undefined && typeof dementiaProb === 'number';

  return (
    <div className="results-display">
      <div className="results-header">
        <h2>Analysis Results</h2>
        {onClose && (
          <button className="results-close" onClick={onClose} title="Close">
            ×
          </button>
        )}
      </div>

      {transcription && (
        <div className="transcription-section">
          <h3>📝 Transcription</h3>
          <div className="transcription-text">
            {transcription}
          </div>
        </div>
      )}

      <div className={`prediction-card ${isError ? 'error' : isInconclusive ? 'inconclusive' : isHealthy ? 'healthy' : 'dementia'}`}>
        <div className="prediction-icon">
          {isError ? '❌' : isInconclusive ? '❓' : isHealthy ? '✅' : '⚠️'}
        </div>
        <div className="prediction-content">
          <h3>Prediction</h3>
          <p className="prediction-label">
            {isError
              ? 'ERROR - PROCESSING FAILED'
              : isInconclusive 
                ? 'INCONCLUSIVE - MANUAL REVIEW RECOMMENDED'
                : isHealthy 
                  ? 'HEALTHY' 
                  : 'DEMENTIA RISK DETECTED'}
          </p>
          <div className="confidence-container">
            <span className="confidence-label">Dementia Probability:</span>
            {hasDementiaProb ? (
              <>
                <div className="probability-gauge-wrapper">
                  <DementiaProbabilityGauge probability={dementiaProb} />
                </div>
                <ProbabilityCalculation 
                  calculationBreakdown={features?.prediction_adjustment?.calculation_breakdown || features?.calculation_breakdown}
                  dementiaProb={dementiaProb}
                />
              </>
            ) : (
              <div className="confidence-unavailable">
                <span className="confidence-na">N/A</span>
                <span className="confidence-na-reason">(Unable to calculate due to processing error)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {flagReason && (
        <div className="flag-reason">
          <h3>⚡ Why Inconclusive?</h3>
          <p>{flagReason}</p>
        </div>
      )}

      {features && Object.keys(features).length > 0 && (
        <div className="features-section">
          <h3>🔍 What Drove This Prediction?</h3>
          
          {features.top_terms && Object.keys(features.top_terms).length > 0 && (
            <div className="feature-subsection terms-subsection">
              <h4>📊 Most Relevant Terms (TF-IDF Weights)</h4>
              <div className="terms-container">
                {Object.entries(features.top_terms).map(([term, weight], index) => (
                  <div key={index} className="term-badge">
                    <span className="term-text">{term}</span>
                    <span className="term-weight">{weight.toFixed(3)}</span>
                    <div className="term-bar-mini" style={{ width: `${weight * 100}%` }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {features.class_probabilities && (
            <div className="feature-subsection probabilities-subsection">
              <h4>📊 Class Probabilities</h4>
              <ClassProbabilitiesChart classProbabilities={features.class_probabilities} />
            </div>
          )}

          {features.recall_accuracy && (
            <div className="feature-subsection recall-accuracy-subsection">
              <h4>🧠 Memory Recall Accuracy</h4>
              <p className="analysis-description">
                Comparison of recalled text with original text to assess memory performance
              </p>
              <div className="recall-accuracy-display">
                <div className={`recall-metric main ${features.recall_accuracy.accuracy < 0.50 ? 'poor' : features.recall_accuracy.accuracy < 0.70 ? 'moderate' : features.recall_accuracy.accuracy < 0.85 ? 'good' : 'excellent'}`}>
                  <span className="recall-label">Overall Recall Accuracy</span>
                  <span className="recall-value">{(features.recall_accuracy.accuracy * 100).toFixed(1)}%</span>
                  {features.recall_accuracy.recall_adjustment !== undefined && features.recall_accuracy.recall_adjustment !== 0 && (
                    <span className={`recall-adjustment ${features.recall_accuracy.recall_adjustment > 0 ? 'increase' : 'decrease'}`}>
                      {features.recall_accuracy.recall_adjustment > 0 ? '+' : ''}
                      {(features.recall_accuracy.recall_adjustment * 100).toFixed(1)}% dementia probability adjustment
                    </span>
                  )}
                </div>
                <div className="recall-details-grid">
                  <div className="recall-detail">
                    <span className="detail-label">Word Match Ratio</span>
                    <span className="detail-value">{(features.recall_accuracy.word_match_ratio * 100).toFixed(1)}%</span>
                  </div>
                  <div className="recall-detail">
                    <span className="detail-label">Key Words Recalled</span>
                    <span className="detail-value">
                      {features.recall_accuracy.key_words_recalled} / {features.recall_accuracy.total_key_words}
                      ({((features.recall_accuracy.key_words_recalled / features.recall_accuracy.total_key_words) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="recall-detail">
                    <span className="detail-label">Missing Words</span>
                    <span className="detail-value">{features.recall_accuracy.missing_words}</span>
                  </div>
                  <div className="recall-detail">
                    <span className="detail-label">Extra Words</span>
                    <span className="detail-value">{features.recall_accuracy.extra_words}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {features.audio_signal_analysis && (
            <div className="feature-subsection audio-signal-subsection">
              <h4>🎤 Direct Audio Signal Analysis</h4>
              <p className="analysis-description">
                Analysis of gaps, pauses, and filler words (uh, umm, ohh) detected directly from audio waveform
              </p>
              <AudioSignalChart audioSignalAnalysis={features.audio_signal_analysis} />
              <div className="time-analysis-grid">
                <div className={`time-metric highlight ${features.audio_signal_analysis.num_pauses_detected > 15 ? 'warning' : ''}`}>
                  <span className="time-label">Pauses Detected</span>
                  <span className="time-value">{features.audio_signal_analysis.num_pauses_detected}</span>
                  {features.audio_signal_analysis.num_pauses_detected > 15 && (
                    <span className="metric-indicator">⚠️ High</span>
                  )}
                </div>
                <div className={`time-metric highlight ${features.audio_signal_analysis.num_filler_candidates > 5 ? 'warning' : ''}`}>
                  <span className="time-label">Filler Candidates</span>
                  <span className="time-value">{features.audio_signal_analysis.num_filler_candidates}</span>
                  {features.audio_signal_analysis.num_filler_candidates > 5 && (
                    <span className="metric-indicator">⚠️ High</span>
                  )}
                </div>
                <div className="time-metric">
                  <span className="time-label">Total Silence Time</span>
                  <span className="time-value">{features.audio_signal_analysis.total_silence_time}s</span>
                </div>
                <div className="time-metric">
                  <span className="time-label">Total Speech Time</span>
                  <span className="time-value">{features.audio_signal_analysis.total_speech_time}s</span>
                </div>
                <div className={`time-metric ${features.audio_signal_analysis.avg_pause_duration > 1.5 ? 'warning' : ''}`}>
                  <span className="time-label">Avg Pause Duration</span>
                  <span className="time-value">{features.audio_signal_analysis.avg_pause_duration}s</span>
                  {features.audio_signal_analysis.avg_pause_duration > 1.5 && (
                    <span className="metric-indicator">⚠️ Long</span>
                  )}
                </div>
                <div className={`time-metric ${features.audio_signal_analysis.filler_density > 0.3 ? 'warning' : ''}`}>
                  <span className="time-label">Filler Density</span>
                  <span className="time-value">{features.audio_signal_analysis.filler_density.toFixed(2)}/sec</span>
                  {features.audio_signal_analysis.filler_density > 0.3 && (
                    <span className="metric-indicator">⚠️ High</span>
                  )}
                </div>
                <div className={`time-metric ${features.audio_signal_analysis.pause_ratio > 0.25 ? 'warning' : ''}`}>
                  <span className="time-label">Pause Ratio</span>
                  <span className="time-value">{(features.audio_signal_analysis.pause_ratio * 100).toFixed(1)}%</span>
                  {features.audio_signal_analysis.pause_ratio > 0.25 && (
                    <span className="metric-indicator">⚠️ High</span>
                  )}
                </div>
                <div className={`time-metric ${features.audio_signal_analysis.pause_to_speech_ratio > 0.4 ? 'warning' : ''}`}>
                  <span className="time-label">Pause/Speech Ratio</span>
                  <span className="time-value">{features.audio_signal_analysis.pause_to_speech_ratio.toFixed(2)}</span>
                  {features.audio_signal_analysis.pause_to_speech_ratio > 0.4 && (
                    <span className="metric-indicator">⚠️ High</span>
                  )}
                </div>
                <div className={`time-metric ${features.audio_signal_analysis.speaking_efficiency < 70 ? 'warning' : ''}`}>
                  <span className="time-label">Speaking Efficiency</span>
                  <span className="time-value">{features.audio_signal_analysis.speaking_efficiency}%</span>
                  {features.audio_signal_analysis.speaking_efficiency < 70 && (
                    <span className="metric-indicator">⚠️ Low</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {features.prediction_adjustment && (
            <div className={`feature-subsection adjustment-subsection ${features.prediction_adjustment.was_adjusted ? 'adjusted' : 'reviewed'}`}>
              <h4>{features.prediction_adjustment.was_adjusted ? '🔄 Prediction Adjusted' : '⚠️ Prediction Reviewed'}</h4>
              <p className="adjustment-note">
                {features.prediction_adjustment.was_adjusted 
                  ? 'Prediction was adjusted based on audio signal analysis (gaps, fillers, pauses)'
                  : 'Prediction reviewed based on detected indicators (gaps, fillers, pauses)'}
              </p>
              {features.prediction_adjustment.dementia_score !== undefined && (
                <div className="dementia-score-display">
                  <span className="score-label">Dementia Risk Score:</span>
                  <span className={`score-value ${features.prediction_adjustment.dementia_score > 0.4 ? 'high' : features.prediction_adjustment.dementia_score > 0.2 ? 'medium' : 'low'}`}>
                    {(features.prediction_adjustment.dementia_score * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              {features.prediction_adjustment.dementia_prob_boost !== undefined && features.prediction_adjustment.dementia_prob_boost > 0 && (
                <div className="confidence-penalty-display">
                  <span className="penalty-label">Probability Increase:</span>
                  <span className="penalty-value boost">
                    +{(features.prediction_adjustment.dementia_prob_boost * 100).toFixed(1)}%
                  </span>
                  {features.prediction_adjustment.boost_details && (
                    <div className="penalty-breakdown">
                      <small>
                        {features.prediction_adjustment.boost_details.pauses > 0 && (
                          <span>{features.prediction_adjustment.boost_details.pauses} pauses</span>
                        )}
                        {features.prediction_adjustment.boost_details.fillers > 0 && (
                          <span>{features.prediction_adjustment.boost_details.fillers} fillers (audio)</span>
                        )}
                        {features.prediction_adjustment.boost_details.text_fillers > 0 && (
                          <span>{features.prediction_adjustment.boost_details.text_fillers} fillers (text)</span>
                        )}
                      </small>
                    </div>
                  )}
                </div>
              )}
              <div className="adjustment-details">
                <div className="adjustment-item">
                  <span className="adjustment-label">Original Prediction:</span>
                  <span className="adjustment-value">
                    {features.prediction_adjustment.original_class === 0 ? 'Healthy' :
                     features.prediction_adjustment.original_class === 1 ? 'MCI' :
                     features.prediction_adjustment.original_class === 2 ? 'Moderate' :
                     'Severe'} (Dementia Prob: {features.prediction_adjustment.original_dementia_prob !== undefined ? (features.prediction_adjustment.original_dementia_prob * 100).toFixed(1) : 'N/A'}%)
                  </span>
                </div>
                <div className="adjustment-item">
                  <span className="adjustment-label">{features.prediction_adjustment.was_adjusted ? 'Adjusted Prediction:' : 'Final Prediction:'}</span>
                  <span className={`adjustment-value ${features.prediction_adjustment.was_adjusted ? 'highlight' : ''}`}>
                    {features.prediction_adjustment.adjusted_class === 0 ? 'Healthy' :
                     features.prediction_adjustment.adjusted_class === 1 ? 'MCI' :
                     features.prediction_adjustment.adjusted_class === 2 ? 'Moderate' :
                     'Severe'} (Dementia Prob: {features.prediction_adjustment.adjusted_dementia_prob !== undefined ? (features.prediction_adjustment.adjusted_dementia_prob * 100).toFixed(1) : 'N/A'}%)
                  </span>
                </div>
                {features.prediction_adjustment.adjustment_reasons && features.prediction_adjustment.adjustment_reasons.length > 0 && (
                  <div className="adjustment-reasons">
                    <strong>Detected Indicators:</strong>
                    <ul>
                      {features.prediction_adjustment.adjustment_reasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {(features.time_analysis || features.text_time_estimates) && (
            <div className="feature-subsection time-analysis-subsection">
              <h4>⏱️ Time Analysis (From Transcription)</h4>
              <TimeAnalysisChart 
                timeAnalysis={features.time_analysis} 
                audioSignalAnalysis={features.audio_signal_analysis}
              />
              <div className="time-analysis-grid">
                {features.time_analysis && (
                  <>
                    <div className="time-metric">
                      <span className="time-label">Audio Duration</span>
                      <span className="time-value">{features.time_analysis.audio_duration}s</span>
                    </div>
                    <div className="time-metric">
                      <span className="time-label">Speaking Time</span>
                      <span className="time-value">{features.time_analysis.speaking_time}s</span>
                    </div>
                    <div className="time-metric">
                      <span className="time-label">Pause Time</span>
                      <span className="time-value">{features.time_analysis.pause_time}s</span>
                    </div>
                    <div className="time-metric">
                      <span className="time-label">Words Per Minute</span>
                      <span className="time-value">{features.time_analysis.words_per_minute} WPM</span>
                    </div>
                    <div className="time-metric">
                      <span className="time-label">Pause Ratio</span>
                      <span className="time-value">{(features.time_analysis.pause_ratio * 100).toFixed(1)}%</span>
                    </div>
                    <div className="time-metric">
                      <span className="time-label">Number of Pauses</span>
                      <span className="time-value">{features.time_analysis.num_pauses}</span>
                    </div>
                    <div className="time-metric">
                      <span className="time-label">Avg Pause Duration</span>
                      <span className="time-value">{features.time_analysis.avg_pause_duration}s</span>
                    </div>
                    <div className="time-metric">
                      <span className="time-label">Speaking Efficiency</span>
                      <span className="time-value">{features.time_analysis.speaking_efficiency}%</span>
                    </div>
                  </>
                )}
                {features.text_time_estimates && (
                  <>
                    <div className="time-metric">
                      <span className="time-label">Estimated Speaking Time</span>
                      <span className="time-value">{features.text_time_estimates.estimated_speaking_time}s</span>
                    </div>
                    <div className="time-metric">
                      <span className="time-label">Estimated WPM</span>
                      <span className="time-value">{features.text_time_estimates.estimated_wpm} WPM</span>
                    </div>
                    <div className="time-metric">
                      <span className="time-label">Hesitation Density</span>
                      <span className="time-value">{(features.text_time_estimates.hesitation_density * 100).toFixed(1)}%</span>
                    </div>
                    <div className="time-metric">
                      <span className="time-label">Pause Indicators</span>
                      <span className="time-value">{features.text_time_estimates.pause_indicators}</span>
                    </div>
                  </>
                )}
                {features.time_analysis && !features.text_time_estimates && (
                  <div className="time-metric">
                    <span className="time-label">Estimated Speaking Time</span>
                    <span className="time-value">{features.time_analysis.estimated_speaking_time || 'N/A'}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {features.numeric_features && Object.keys(features.numeric_features).length > 0 && (
            <div className="feature-subsection numeric-subsection">
              <h4>📈 Speech Pattern Indicators</h4>
              <div className="numeric-features-grid">
                {Object.entries(features.numeric_features).map(([key, value]) => {
                  const displayKey = key
                    .replace(/_/g, ' ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                  
                  const isRatio = ['stopword_ratio', 'uniq_word_ratio'].includes(key);
                  const displayValue = isRatio ? `${(value * 100).toFixed(1)}%` : value;
                  
                  let severity = 'normal';
                  if (key === 'filler_count' && value > 3) severity = 'high';
                  if (key === 'pronoun_count' && value > 15) severity = 'high';
                  if (key === 'stopword_ratio' && value > 0.35) severity = 'high';
                  
                  return (
                    <div key={key} className={`numeric-feature ${severity}`}>
                      <div className="feature-name">{displayKey}</div>
                      <div className="feature-value">{displayValue}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="features-note">
            <p>
              These linguistic and numeric indicators help the model identify potential speech patterns. 
              Higher filler word counts, increased pronouns, and unusual ratios may suggest cognitive challenges.
            </p>
          </div>
        </div>
      )}

      {validationIssues && validationIssues.length > 0 && (
        <div className={`validation-issues ${isError ? 'error-issues' : ''}`}>
          <h3>{isError ? '❌ Processing Error' : '⚠️ Validation Issues'}</h3>
          <ul>
            {validationIssues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
          {isError ? (
            <p className="issues-note error-note">
              <strong>Action Required:</strong> Please resolve the error above before attempting another analysis. 
              {validationIssues.some(issue => issue.toLowerCase().includes('ffmpeg')) && (
                <span> See <strong>SETUP.md</strong> for FFmpeg installation instructions.</span>
              )}
            </p>
          ) : (
            <p className="issues-note">
              These issues may affect prediction accuracy. Please provide more complete input for better results.
            </p>
          )}
        </div>
      )}

      <div className="info-section">
        <h3>ℹ️ What This Means</h3>
        {isInconclusive ? (
          <p>
            The model's confidence is below the recommended threshold for automated diagnosis. 
            A clinician should manually review the transcription and speech patterns to make an informed decision.
          </p>
        ) : isHealthy ? (
          <p>
            The analyzed speech patterns are consistent with <strong>normal cognitive function</strong>.
            The model did not detect characteristics typically associated with dementia.
          </p>
        ) : (
          <p>
            The analyzed speech patterns show <strong>characteristics associated with dementia risk</strong>.
            These include patterns like increased word-finding difficulties, repetition, or hesitations.
          </p>
        )}
        <p className="disclaimer">
          <strong>Disclaimer:</strong> This AI system is designed for screening purposes only and should not be used as a substitute for professional medical diagnosis. Please consult with a healthcare professional for proper evaluation and diagnosis.
        </p>
      </div>
    </div>
  );
}

export default ResultsDisplay;
