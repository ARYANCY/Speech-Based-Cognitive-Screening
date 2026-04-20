import React from 'react';
import './ResultsDisplay.css';

function ResultsDisplay({ results }) {
  if (!results) return null;

  const { 
    prediction, 
    confidence, 
    features,
    transcription,
    filler_words = [],
    filler_count = 0,
    filler_words_list = [],
    total_words = 0,
    text_similarity,
    is_valid = true
  } = results;

  const isHealthy = prediction === 'Healthy' || prediction === 0;
  const isInconclusive = prediction === 'Inconclusive';
  const confidencePercent = confidence ? (confidence * 100).toFixed(2) : 0;

  return (
    <div className="results-display">
      <div className="results-header">
        <h2>Analysis Results</h2>
      </div>

      {/* Validation Warning */}
      {text_similarity !== null && text_similarity !== undefined && !is_valid && (
        <div style={{
          background: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ margin: '0 0 0.75rem 0', color: '#856404', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ⚠️ Validation Failed
          </h3>
          <p style={{ margin: 0, color: '#856404' }}>
            The audio transcription does not match the provided paragraph. Similarity: <strong>{(text_similarity * 100).toFixed(1)}%</strong> (required: 60%).
            Please ensure the audio matches the paragraph you provided.
          </p>
        </div>
      )}

      {/* Transcription Section */}
      {transcription && (
        <div style={{
          background: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '1.1rem' }}>
            📝 Transcription
          </h3>
          <div style={{
            background: 'white',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.95rem',
            lineHeight: '1.6',
            color: '#333'
          }}>
            {transcription}
          </div>
          {total_words > 0 && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: '#666' }}>
              Total words: {total_words}
            </div>
          )}
          {text_similarity !== null && text_similarity !== undefined && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: is_valid ? '#28a745' : '#dc3545' }}>
              Text similarity: <strong>{(text_similarity * 100).toFixed(1)}%</strong> {is_valid ? '✓' : '✗'}
            </div>
          )}
        </div>
      )}

      {/* Audio Analysis Statistics: Pause Count and Filler Words */}
      {features?.pause_count !== undefined && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
          border: '2px solid #667eea',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📊 Audio Analysis Statistics
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem' 
          }}>
            {features.pause_count !== undefined && (
              <div style={{
                background: 'white',
                padding: '1rem',
                borderRadius: '8px',
                border: '2px solid #667eea',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#999', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Pause Count
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>
                  {features.pause_count}
                </div>
                {features.pause_mean_sec !== undefined && features.pause_mean_sec > 0 && (
                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                    Avg: {features.pause_mean_sec.toFixed(2)}s
                  </div>
                )}
              </div>
            )}
            
            {filler_count !== undefined && (
              <div style={{
                background: 'white',
                padding: '1rem',
                borderRadius: '8px',
                border: '2px solid #ffc107',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#999', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Filler Words
                </div>
                <div style={{ 
                  fontSize: '2rem', 
                  fontWeight: 'bold', 
                  color: filler_count > 0 ? '#ff9800' : '#4caf50' 
                }}>
                  {filler_count}
                </div>
                {filler_words_list.length > 0 && (
                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                    {filler_words_list.slice(0, 3).join(', ')}
                    {filler_words_list.length > 3 && '...'}
                  </div>
                )}
                {filler_count === 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#4caf50', marginTop: '0.25rem' }}>
                    No fillers detected
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`prediction-card ${isInconclusive ? 'inconclusive' : isHealthy ? 'healthy' : 'dementia'}`}>
        <div className="prediction-icon">
          {isInconclusive ? '❓' : isHealthy ? '✅' : '⚠️'}
        </div>
        <div className="prediction-content">
          <h3>Prediction</h3>
          <p className="prediction-label">
            {isInconclusive 
              ? 'INCONCLUSIVE - MANUAL REVIEW RECOMMENDED'
              : isHealthy 
                ? 'HEALTHY' 
                : 'DEMENTIA RISK DETECTED'}
          </p>
          <div className="confidence-container">
            <span className="confidence-label">Confidence Level:</span>
            <div className="confidence-bar-wrapper">
              <div
                className={`confidence-bar ${isInconclusive ? 'inconclusive' : isHealthy ? 'healthy' : 'dementia'}`}
                style={{ width: `${confidencePercent}%` }}
              >
                <span className="confidence-value">{confidencePercent}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filler Words Details */}
      {filler_count > 0 && filler_words.length > 0 && (
        <div style={{
          background: '#fff3cd',
          borderLeft: '4px solid #ffc107',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ margin: '0 0 0.75rem 0', color: '#856404' }}>
            🗣️ Filler Words Detected ({filler_count})
          </h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Filler words found:</strong> {filler_words_list.length > 0 ? filler_words_list.join(', ') : 'None'}
          </div>
          <details style={{ marginTop: '0.5rem' }}>
            <summary style={{ cursor: 'pointer', color: '#856404', fontWeight: 500 }}>
              View Filler Words with Timestamps ({filler_words.length})
            </summary>
            <div style={{ marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
              {filler_words.map((filler, idx) => (
                <div key={idx} style={{ 
                  padding: '0.5rem', 
                  marginBottom: '0.25rem', 
                  background: 'white', 
                  borderRadius: '4px',
                  fontSize: '0.85rem'
                }}>
                  <strong>"{filler.word}"</strong> at {filler.start.toFixed(2)}s - {filler.end.toFixed(2)}s 
                  ({filler.duration_ms.toFixed(0)}ms)
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {features && Object.keys(features).length > 0 && (
        <div className="features-section">
          <h3>🔍 Detailed Audio Features</h3>
          <div className="features-grid">
            {Object.entries(features).map(([key, value]) => {
              if (value === null || value === undefined) return null;
              const displayKey = key.replace(/_/g, ' ').split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ');
              const displayValue = typeof value === 'number' ? value.toFixed(4) : value;
              return (
                <div key={key} className="feature-item">
                  <strong>{displayKey}:</strong> {displayValue}
                </div>
              );
            })}
          </div>
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
