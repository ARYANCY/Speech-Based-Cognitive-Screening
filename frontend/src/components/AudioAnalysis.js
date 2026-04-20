import React, { useState, useEffect, useRef } from 'react';
import apiService from '../services/apiService';
import './AudioAnalysis.css';

// 10 neutral paragraphs to show to the user (randomized)
const PARAGRAPHS = [
  `The cat walked along the garden wall and sat beneath the old oak tree. Children played nearby while neighbors watered plants. The sky was clear and a gentle breeze moved the leaves. Later, the small market opened and people chatted about their daily activities.`,
  `On a bright morning, people gathered at the community center to exchange books and recipes. Birds sang from the rooftops and a dog chased a ball across the lawn. Everyone smiled as the coffee cart arrived and the conversation turned to weekend plans.`,
  `The bakery on the corner filled the street with the smell of fresh bread. A delivery truck arrived with crates of fruit and a vendor arranged apples in neat piles. Passersby stopped to admire the window display and pick out pastries for the afternoon.`,
  `A small boat drifted slowly on the calm river while fishermen prepared their lines. Nearby, families walked along the bank and children fed ducks scraps of bread. The sun reflected off the water creating bright patterns that danced across the surface.`,
  `In the neighborhood park, people tended small vegetable plots and compared tips for growing tomatoes. A group practiced gentle stretching exercises and an artist sketched the scene from a bench. The atmosphere was relaxed and conversational.`,
  `The library opened its doors to a quiet room of readers. Someone shelved a stack of returned novels while another person looked for historical maps. A librarian recommended a set of travel guides to a visitor making plans for a vacation.`,
  `During the afternoon market, local farmers displayed jars of honey and bunches of herbs. Neighbors swapped stories about recipes and home repairs as the bell above the shop door chimed. The sun warmed the pavement and created a pleasant hum of activity.`,
  `A volunteer group organized a neighborhood clean-up and placed colorful bins for recycling. People chatted about the best places to plant native flowers and shared seeds. Children painted signs to encourage wildlife-friendly gardens nearby.`,
  `At the train station, commuters read newspapers and checked schedules. A musician played a gentle tune on the platform while an elderly couple shared a sandwich on a nearby bench. The announcements called the next arrivals in a calm voice.`,
  `On an ordinary Sunday, families prepared meals and planned afternoon walks. Someone practiced the piano with a soft melody and a neighbor watered the window plants. The day moved slowly with small, pleasant routines and simple comforts.`
];

function AudioAnalysis({ onResults, onLoading, onError }) {
  const [audioFile, setAudioFile] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  const [paragraph, setParagraph] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const intervalRef = useRef(null);

  // Memory test states
  const [memoryTestMode, setMemoryTestMode] = useState(false);
  const [memoryText, setMemoryText] = useState('');
  const [hintText, setHintText] = useState('');
  const [isTextVisible, setIsTextVisible] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef(null);
  
  // Waveform visualization refs
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);

  // Extract key words and create hints for memory test
  const generateHints = (inputText) => {
    if (!inputText.trim()) return '';
    
    const words = inputText.trim().split(/\s+/);
    const keyWords = new Set();
    const keepWords = ['i'];
    const hideWords = [
      'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
      'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'and', 'or', 'but', 'so', 'yet', 'as', 'if', 'when', 'where', 'why', 'how',
      'this', 'that', 'these', 'those', 'it', 'its', 'live', 'came', 'go', 'went',
      'come', 'get', 'got', 'make', 'made', 'take', 'took', 'see', 'saw', 'know',
      'think', 'say', 'said', 'tell', 'told', 'ask', 'asked'
    ];
    
    words.forEach((word) => {
      const cleanWord = word.replace(/[.,!?;:]/g, '').toLowerCase();
      const originalWord = word.replace(/[.,!?;:]/g, '');
      
      if (hideWords.includes(cleanWord)) return;
      if (cleanWord.length <= 3 && !keepWords.includes(cleanWord)) return;
      
      const isCapitalized = word[0] === word[0].toUpperCase() && 
                          word[0] !== word[0].toLowerCase() && 
                          word.length > 1;
      const isLongWord = cleanWord.length >= 5;
      const isProperNoun = isCapitalized && cleanWord.length >= 4;
      
      if (keepWords.includes(cleanWord) || isProperNoun || isLongWord) {
        keyWords.add(originalWord);
      }
    });
    
    let hint = '';
    words.forEach((word, index) => {
      const cleanWord = word.replace(/[.,!?;:]/g, '').toLowerCase();
      const originalWord = word.replace(/[.,!?;:]/g, '');
      const hasLeadingPunctuation = /^[.,!?;:]/.test(word);
      
      let shouldShow = false;
      if (!hasLeadingPunctuation) {
        shouldShow = keyWords.has(originalWord) || 
                    keyWords.has(cleanWord) ||
                    keepWords.includes(cleanWord);
      }
      
      hint += shouldShow ? originalWord : '........';
      
      const punctuation = word.match(/[.,!?;:]/g);
      if (punctuation) hint += punctuation.join('');
      if (index < words.length - 1) hint += '........';
    });
    
    return hint.replace(/\.{11,}/g, '........').trim();
  };

  // Start memory test
  const handleStartMemoryTest = () => {
    // Use paragraph if memory test mode is enabled, otherwise use custom text
    const textToUse = memoryTestMode ? paragraph : memoryText;
    
    if (!textToUse.trim()) {
      onError('Please enter some text for the memory test or use the paragraph above');
      return;
    }

    const hints = generateHints(textToUse);
    setHintText(hints);
    setIsTextVisible(true);
    setTimeRemaining(18);
    
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsTextVisible(false);
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Reset memory test
  const handleResetMemoryTest = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsTextVisible(true);
    setTimeRemaining(0);
    setHintText('');
  };

  const isValidAudioFile = (file) => {
    if (!file) return false;
    const allowedMimes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/ogg',
      'audio/oga',
      'audio/mp4',
      'audio/x-m4a',
      'audio/aac',
      'audio/x-aac',
      'audio/webm', // browser microphone recordings
    ];

    // If browser provides a mime type, accept if in list
    if (file.type && allowedMimes.includes(file.type)) return true;

    // Fallback: check extension from file name (covers cases where type is empty)
    const name = file.name || '';
    return /\.(mp3|wav|ogg|oga|mp4|m4a|aac|webm)$/i.test(name);
  };
  

  useEffect(() => {
    // pick a random paragraph on mount
    const idx = Math.floor(Math.random() * PARAGRAPHS.length);
    setParagraph(PARAGRAPHS[idx]);
    
    // Initialize canvas size
    const canvas = canvasRef.current;
    if (canvas) {
      const resizeCanvas = () => {
        canvas.width = canvas.offsetWidth;
        canvas.height = 150;
        // Clear canvas
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgb(20, 20, 20)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      };
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      
      return () => {
        window.removeEventListener('resize', resizeCanvas);
      };
    }
    
    return () => {
      // cleanup any running recorder timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (e) {}
      }
      // Cleanup waveform visualization
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
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!isValidAudioFile(file)) {
        onError('Please upload a valid audio file (MP3, WAV, OGG, M4A, MP4 or AAC)');
        return;
      }
      setAudioFile(file);
      const audioUrl = URL.createObjectURL(file);
      setAudioPreview(audioUrl);
      
      // Visualize the uploaded audio file
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = canvas.offsetWidth;
          canvas.height = 150;
        }
        visualizeAudioFile(audioUrl);
      }, 100);
      
      onError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!audioFile) {
      onError('Please select an audio file or record audio');
      return;
    }

    onLoading(true);
    onError(null);

    try {
      // If in memory test mode, use paragraph (or custom text if no paragraph)
      const textToUse = memoryTestMode ? (paragraph || memoryText) : null;
      const originalText = memoryTestMode && textToUse ? textToUse : null;
      const hints = memoryTestMode && hintText ? hintText : null;
      
      const result = await apiService.predictAudio(audioFile, originalText, hints);
      onResults({
        type: memoryTestMode ? 'memory-test' : 'audio',
        input: audioFile.name,
        originalText: originalText,
        hintText: hints,
        transcription: result.transcription || result.text || '',
        prediction: result.prediction,
        label: result.label,
        dementia_probability: result.dementia_probability,
        confidence: result.confidence || result.dementia_probability,
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

  // Waveform visualization function
  const visualizeWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current) return;

    const canvasCtx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      // Check if we should continue (analyser still exists and audio context is running)
      if (!analyserRef.current || !audioContextRef.current || audioContextRef.current.state === 'closed') {
        return; // Stop if context is closed or analyser is gone
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

  // Visualize uploaded audio file
  const visualizeAudioFile = (audioUrl) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const audio = new Audio(audioUrl);
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaElementSource(audio);
    
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvasCtx = canvas.getContext('2d');

    const draw = () => {
      if (audio.paused || audio.ended) {
        // Draw static waveform when paused
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
        return;
      }

      requestAnimationFrame(draw);
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

    audio.addEventListener('play', draw);
    audio.addEventListener('pause', draw);
    audio.addEventListener('ended', draw);
    draw(); // Initial draw
  };

  // Microphone recording handlers
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
      
      const options = { mimeType: 'audio/webm' };
      const mediaRecorder = new MediaRecorder(stream, options);
      recordedChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `recording_${Date.now()}.webm`, { type: blob.type });
        setAudioFile(file);
        const audioUrl = URL.createObjectURL(blob);
        setAudioPreview(audioUrl);
        
        // Stop visualization
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        analyserRef.current = null;
        
        // Visualize the recorded audio
        setTimeout(() => visualizeAudioFile(audioUrl), 100);
        
        // stop all tracks
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setIsRecording(false);
        // stop timer
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setIsRecording(true);
      // start simple timer
      setRecordingTime(0);
      intervalRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
      
      // Start waveform visualization
      visualizeWaveform();
      
      onError(null);
    } catch (err) {
      onError('Microphone access denied or unavailable.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    // Stop visualization
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const handleClear = () => {
    setAudioFile(null);
    setAudioPreview(null);
    onResults(null);
    onError(null);
  };

  return (
    <div className="audio-analysis">
      <div className="analysis-header">
        <h2>🎤 Audio Analysis</h2>
        <p className="subtitle">Upload audio file or record directly from your microphone</p>
      </div>

      {/* Memory Test Mode Toggle */}
      <div className="memory-test-toggle">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={memoryTestMode}
            onChange={(e) => {
              setMemoryTestMode(e.target.checked);
              if (!e.target.checked) {
                handleResetMemoryTest();
                setMemoryText('');
                setHintText('');
              }
            }}
          />
          <span>🧠 Enable Memory Test Mode</span>
        </label>
        {memoryTestMode && (
          <p className="toggle-description">
            Enter text, view it for 18 seconds, then recall it with hints while recording
          </p>
        )}
      </div>

      {/* Memory Test Input - Only show custom text input if not using paragraph */}
      {memoryTestMode && !paragraph && (
        <div className="memory-test-section">
          <div className="memory-input-section">
            <label htmlFor="memory-text-input">Enter Text to Remember:</label>
            <textarea
              id="memory-text-input"
              className="memory-text-input"
              value={memoryText}
              onChange={(e) => setMemoryText(e.target.value)}
              placeholder="Enter text for memory test (e.g., 'I am Aryan, I live in Ulubari Guwahati, I came to Pune for SIH')"
              rows={3}
              disabled={timeRemaining > 0}
            />
          </div>
        </div>
      )}

      <div className="file-upload-group">
        <label htmlFor="audio-input">Select audio file to analyze:</label>
        <div className="file-input-wrapper">
          <input
            id="audio-input"
            type="file"
            accept=".mp3,.wav,.ogg,.oga,.mp4,.m4a,.aac,audio/*"
            onChange={handleFileChange}
          />
          {/* Make the visible element a real label so clicks activate the hidden input */}
          <label htmlFor="audio-input" className="file-input-label">
            {audioFile ? `📁 ${audioFile.name}` : '📂 Choose audio file...'}
          </label>
        </div>
      </div>

      <div className="paragraph-section">
        <label>
          {memoryTestMode ? 'Memory Test - Read and Remember:' : 'Read this paragraph aloud (neutral):'}
        </label>
        
        {/* Text Display Phase - Show paragraph for 18 seconds in memory test mode */}
        {memoryTestMode && timeRemaining > 0 && isTextVisible ? (
          <div className="memory-phase text-display-phase">
            <div className="phase-header">
              <h3>Read and Remember</h3>
              <div className="timer-display">
                <span className="timer-label">Time Remaining:</span>
                <span className="timer-value">{timeRemaining}s</span>
              </div>
            </div>
            <div className="text-display">
              {paragraph}
            </div>
          </div>
        ) : memoryTestMode && !isTextVisible && timeRemaining === 0 && hintText ? (
          /* Hints Phase - Show hints after text is hidden */
          <div className="memory-phase recall-phase">
            <div className="phase-header">
              <h3>Recall with Hints</h3>
              <button className="btn btn-secondary btn-sm" onClick={handleResetMemoryTest}>
                Reset Test
              </button>
            </div>
            <div className="hint-display">
              <p className="hint-label">Hint:</p>
              <div className="hint-text">{hintText}</div>
            </div>
            <p className="recording-instruction" style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
              Now record yourself recalling the paragraph using the microphone below
            </p>
          </div>
        ) : (
          /* Normal paragraph display when not in memory test or before test starts */
          <>
            <div className="paragraph-box">
          {paragraph}
        </div>
            <div className="button-group">
          <button
            className="btn btn-secondary"
            onClick={() => {
              const idx = Math.floor(Math.random() * PARAGRAPHS.length);
              setParagraph(PARAGRAPHS[idx]);
                  handleResetMemoryTest();
            }}
          >
            🔁 New Paragraph
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={() => navigator.clipboard && navigator.clipboard.writeText(paragraph)}
          >
            📋 Copy Paragraph
          </button>
              
              {memoryTestMode && timeRemaining === 0 && isTextVisible && (
                <button 
                  className="btn btn-primary" 
                  onClick={handleStartMemoryTest}
                  disabled={!paragraph.trim()}
                >
                  ▶️ Start Memory Test
                </button>
              )}
        </div>
          </>
        )}
      </div>

      <div className="microphone-controls">
        <label>Or record directly using your microphone:</label>
        <div className="waveform-container">
          <canvas
            ref={canvasRef}
            className="waveform-canvas"
            style={{ width: '100%', height: '150px', display: 'block' }}
          />
        </div>
        <div className="recording-controls">
          {!isRecording ? (
            <button className="btn btn-primary" onClick={handleStartRecording}>
              🎙️ Start Recording
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={handleStopRecording}>
              ⏹ Stop Recording
            </button>
          )}
          <div className="recording-status">
            <span className={`recording-indicator ${isRecording ? 'active' : ''}`} />
            <span className="recording-time">
              {isRecording ? `${recordingTime}s recording` : 'Not recording'}
            </span>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setAudioFile(null);
              setAudioPreview(null);
              onResults(null);
              onError(null);
              // Clear canvas
              const canvas = canvasRef.current;
              if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = 'rgb(20, 20, 20)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
              }
            }}
            disabled={!audioFile}
          >
            🗑️ Clear Recording
          </button>
        </div>
      </div>

      {audioPreview && (
        <div className="audio-preview">
          <label>Audio Preview:</label>
          <audio controls src={audioPreview} />
          <div className="file-info">
            <p><strong>File:</strong> {audioFile.name}</p>
            <p><strong>Size:</strong> {(audioFile.size / 1024).toFixed(2)} KB</p>
            <p><strong>Type:</strong> {audioFile.type || 'Unknown'}</p>
          </div>
        </div>
      )}

      <div className="button-group">
        <button
          className="btn btn-primary"
          onClick={handleAnalyze}
          disabled={!audioFile || (memoryTestMode && isTextVisible && timeRemaining > 0)}
        >
          🎤 {memoryTestMode && !isTextVisible ? 'Analyze Recall' : 'Analyze Audio'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleClear}
          disabled={!audioFile}
        >
          🗑️ Clear
        </button>
      </div>

      <div className="info-box">
        <strong>ℹ️ Supported Formats:</strong>
        <ul>
          <li>MP3 (.mp3)</li>
          <li>WAV (.wav)</li>
          <li>OGG (.ogg)</li>
          <li>MP4 Audio (.m4a)</li>
          <li>Browser recordings (.webm)</li>
        </ul>
      </div>
    </div>
  );
}

export default AudioAnalysis;
