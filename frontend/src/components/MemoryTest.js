import React, { useState, useEffect, useRef } from 'react';
import apiService from '../services/apiService';
import './MemoryTest.css';

function MemoryTest({ onResults, onLoading, onError }) {
  const [text, setText] = useState('');
  const [hintText, setHintText] = useState('');
  const [isTextVisible, setIsTextVisible] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState(null);
  
  const timerRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Extract key words and create hints
  // Example: "i am aryan ,i live in ulubari guwahati,i came to pune for sih"
  // Output: "i........aryan..........ulubari........guwahati"
  const generateHints = (inputText) => {
    if (!inputText.trim()) return '';
    
    // Split by spaces, but preserve punctuation
    const words = inputText.trim().split(/\s+/);
    const keyWords = new Set();
    
    // Words to always keep (pronouns - standalone "i" only, not "i" in ",i")
    const keepWords = ['i'];
    
    // Words to always hide (prepositions, articles, common verbs, conjunctions, short words)
    const hideWords = [
      'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
      'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'and', 'or', 'but', 'so', 'yet', 'as', 'if', 'when', 'where', 'why', 'how',
      'this', 'that', 'these', 'those', 'it', 'its', 'live', 'came', 'go', 'went',
      'come', 'get', 'got', 'make', 'made', 'take', 'took', 'see', 'saw', 'know',
      'think', 'say', 'said', 'tell', 'told', 'ask', 'asked'
    ];
    
    // Extract important words to keep
    words.forEach((word) => {
      const cleanWord = word.replace(/[.,!?;:]/g, '').toLowerCase();
      const originalWord = word.replace(/[.,!?;:]/g, '');
      
      // Skip if it's a word we want to hide
      if (hideWords.includes(cleanWord)) {
        return;
      }
      
      // Skip short words (3 chars or less) unless they're pronouns
      if (cleanWord.length <= 3 && !keepWords.includes(cleanWord)) {
        return;
      }
      
      // Keep if:
      // 1. It's in the keep words list (pronouns like "i")
      // 2. It's capitalized AND longer than 3 chars (proper nouns: names, places)
      // 3. It's a longer word (5+ chars) - likely important nouns/adjectives/place names
      const isCapitalized = word[0] === word[0].toUpperCase() && 
                          word[0] !== word[0].toLowerCase() && 
                          word.length > 1;
      const isLongWord = cleanWord.length >= 5; // Changed to 5+ for better filtering
      
      // Special case: if capitalized and 4+ chars, likely a proper noun
      const isProperNoun = isCapitalized && cleanWord.length >= 4;
      
      if (
        keepWords.includes(cleanWord) ||
        isProperNoun ||
        isLongWord
      ) {
        keyWords.add(originalWord);
      }
    });
    
    // Create hint string with dots between key words
    let hint = '';
    
    words.forEach((word, index) => {
      const cleanWord = word.replace(/[.,!?;:]/g, '').toLowerCase();
      const originalWord = word.replace(/[.,!?;:]/g, '');
      
      // Special handling: if word starts with punctuation (like ",i"), don't show "i"
      const hasLeadingPunctuation = /^[.,!?;:]/.test(word);
      
      // Check if this word should be shown
      // Don't show if it has leading punctuation (like ",i")
      let shouldShow = false;
      if (!hasLeadingPunctuation) {
        shouldShow = keyWords.has(originalWord) || 
                    keyWords.has(cleanWord) ||
                    keepWords.includes(cleanWord);
      }
      
      if (shouldShow) {
        // Show the word (preserve original case)
        hint += originalWord;
      } else {
        // Hide with dots
        hint += '........';
      }
      
      // Add punctuation if present (after the word or dots)
      const punctuation = word.match(/[.,!?;:]/g);
      if (punctuation) {
        hint += punctuation.join('');
      }
      
      // Add spacing (dots) between words
      if (index < words.length - 1) {
        hint += '........';
      }
    });
    
    // Clean up excessive dots (more than 10 consecutive dots) to max 8
    hint = hint.replace(/\.{11,}/g, '........');
    
    return hint.trim();
  };

  // Start memory test
  const handleStartTest = () => {
    if (!text.trim()) {
      onError('Please enter some text for the memory test');
      return;
    }

    // Generate hints
    const hints = generateHints(text);
    setHintText(hints);
    
    // Show text initially
    setIsTextVisible(true);
    setTimeRemaining(18); // 18 seconds (can be 15-20)
    setRecordedAudio(null);
    
    // Start countdown timer
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Hide text when timer reaches 0
          setIsTextVisible(false);
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Stop test and reset
  const handleReset = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    stopRecording();
    setIsTextVisible(true);
    setTimeRemaining(0);
    setRecordedAudio(null);
    setHintText('');
    setRecordingTime(0);
  };

  // Start audio recording
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Set up Web Audio API for visualization
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 2048;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      // Set canvas size
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = canvas.offsetWidth;
        canvas.height = 150;
      }
      
      // Start waveform visualization
      visualizeWaveform();
      
      const options = { mimeType: 'audio/webm' };
      const mediaRecorder = new MediaRecorder(stream, options);
      recordedChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);
        setRecordedAudio(audioUrl);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      
    } catch (error) {
      onError('Microphone access denied. Please allow microphone access and try again.');
      console.error('Error accessing microphone:', error);
    }
  };

  // Stop audio recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    
    // Stop waveform visualization
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  // Waveform visualization
  const visualizeWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current) return;

    const canvasCtx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current || !audioContextRef.current || audioContextRef.current.state === 'closed') {
        return;
      }

      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = 'rgb(20, 20, 20)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgb(102, 126, 234)';
      canvasCtx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();
  };

  // Analyze recorded audio
  const handleAnalyzeRecording = async () => {
    if (!recordedAudio) {
      onError('No recording available. Please record your response first.');
      return;
    }

    onLoading(true);
    onError(null);

    try {
      // Convert blob URL to File
      const response = await fetch(recordedAudio);
      const blob = await response.blob();
      const file = new File([blob], 'recording.webm', { type: 'audio/webm' });

      // Pass original text and hint text for recall accuracy calculation
      const result = await apiService.predictAudio(file, text, hintText);
      onResults({
        type: 'memory-test',
        originalText: text,
        hintText: hintText,
        prediction: result.prediction,
        label: result.label,
        dementia_probability: result.dementia_probability,
        confidence: result.confidence,
        validationIssues: result.validation_issues || [],
        flagReason: result.flag_reason || null,
        features: result.features || {},
        transcription: result.transcription || ''
      });
    } catch (error) {
      onError(error.message);
      onResults(null);
    } finally {
      onLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      stopRecording();
    };
  }, []);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const resizeCanvas = () => {
        canvas.width = canvas.offsetWidth;
        canvas.height = 150;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgb(20, 20, 20)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      };
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      return () => window.removeEventListener('resize', resizeCanvas);
    }
  }, []);

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('Error stopping recorder:', e);
      }
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="memory-test">
      <div className="analysis-header">
        <h2>🧠 Memory Recall Test</h2>
        <p className="subtitle">Read the text, then recall it with hints</p>
      </div>

      <div className="input-section">
        <div className="input-header">
          <label htmlFor="text-input">Enter Text to Remember</label>
        </div>
        
        <textarea
          id="text-input"
          className="text-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text for memory test (e.g., 'I am Aryan, I live in Ulubari Guwahati, I came to Pune for SIH')"
          rows={4}
          disabled={timeRemaining > 0}
        />

        {timeRemaining === 0 && !isTextVisible && (
          <button 
            className="btn btn-primary" 
            onClick={handleStartTest}
            disabled={!text.trim()}
          >
            ▶️ Start Test
          </button>
        )}
      </div>

      {/* Text Display Phase */}
      {timeRemaining > 0 && isTextVisible && (
        <div className="memory-phase text-display-phase">
          <div className="phase-header">
            <h3>📖 Read and Remember</h3>
            <div className="timer-display">
              <span className="timer-label">Time Remaining:</span>
              <span className="timer-value">{timeRemaining}s</span>
            </div>
          </div>
          <div className="text-display">
            {text}
          </div>
        </div>
      )}

      {/* Hints and Recording Phase */}
      {!isTextVisible && timeRemaining === 0 && (
        <div className="memory-phase recall-phase">
          <div className="phase-header">
            <h3>🎯 Recall with Hints</h3>
            <button className="btn btn-secondary btn-sm" onClick={handleReset}>
              🔄 Reset Test
            </button>
          </div>
          
          <div className="hint-display">
            <p className="hint-label">Hint:</p>
            <p className="hint-text">{hintText}</p>
          </div>

          <div className="recording-section">
            <div className="recording-header">
              <h4>🎤 Record Your Response</h4>
              <p className="recording-instruction">
                Recall the text using the hints above. Click the microphone button to start recording.
              </p>
            </div>

            {/* Waveform Canvas */}
            {isRecording && (
              <div className="waveform-container">
                <canvas ref={canvasRef} className="waveform-canvas" />
              </div>
            )}

            {/* Recording Controls */}
            <div className="recording-controls">
              {!isRecording && !recordedAudio && (
                <button
                  className="btn btn-primary btn-record"
                  onClick={handleStartRecording}
                >
                  🎤 Start Recording
                </button>
              )}

              {isRecording && (
                <>
                  <div className="recording-status">
                    <div className="recording-indicator active"></div>
                    <span className="recording-time">Recording: {formatTime(recordingTime)}</span>
                  </div>
                  <button
                    className="btn btn-danger"
                    onClick={handleStopRecording}
                  >
                    ⏹️ Stop Recording
                  </button>
                </>
              )}

              {recordedAudio && !isRecording && (
                <div className="recording-complete">
                  <div className="recording-status">
                    <span className="recording-time">✅ Recorded: {formatTime(recordingTime)}</span>
                  </div>
                  <audio controls src={recordedAudio} className="recorded-audio-player" />
                  <div className="recording-actions">
                    <button
                      className="btn btn-primary"
                      onClick={handleAnalyzeRecording}
                    >
                      🔍 Analyze Recording
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setRecordedAudio(null);
                        setRecordingTime(0);
                      }}
                    >
                      🔄 Record Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="info-section">
        <div className="info-card">
          <h3>ℹ️ How It Works</h3>
          <ol>
            <li>Enter the text you want to test</li>
            <li>Click "Start Test" - text will be shown for 18 seconds</li>
            <li>Text will be hidden and hints will appear</li>
            <li>Record yourself recalling the text using the hints</li>
            <li>Analyze your recording for dementia indicators</li>
          </ol>
        </div>

        <div className="info-card">
          <h3>💡 Tips</h3>
          <ul>
            <li>Focus on reading the text during the display phase</li>
            <li>Use the hints to help recall the information</li>
            <li>Speak naturally when recording</li>
            <li>Try to recall as much detail as possible</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default MemoryTest;

