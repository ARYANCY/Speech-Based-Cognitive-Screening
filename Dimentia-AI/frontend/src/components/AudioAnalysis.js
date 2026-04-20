import React, { useState, useEffect, useRef } from 'react';
import apiService from '../services/apiService';
import './AudioAnalysis.css';

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
  const [pauseInfo, setPauseInfo] = useState(null);
  const pauseDetectionRef = useRef({
    isPaused: false,
    pauseStartTime: null,
    pauses: [],
    lastUpdateTime: null
  });
  const audioElementRef = useRef(null);
  const waveformCanvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const frequencyDataRef = useRef(null);

  // Set default paragraph from predefined list
  useEffect(() => {
    if (!paragraph && PARAGRAPHS.length > 0) {
      setParagraph(PARAGRAPHS[0]);
    }
  }, [paragraph]);

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
    return () => {
      // cleanup any running recorder timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (e) {}
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Set up Web Audio API waveform visualization when an audio preview exists
  useEffect(() => {
    if (!audioPreview || !audioElementRef.current || !waveformCanvasRef.current) {
      // Clean up if no preview
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const canvas = waveformCanvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    const audioElement = audioElementRef.current;

    // Clean up any previous animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    // Check if source was already created for this element
    const sourceKey = audioElement.dataset.sourceKey;
    const currentPreviewKey = audioPreview; // Use preview URL as key
    
    // If this is the same preview and source already exists, reuse it
    if (sourceKey === currentPreviewKey && audioCtxRef.current && analyserRef.current) {
      // Just restart the visualization
      const draw = () => {
        if (!analyserRef.current || !dataArrayRef.current) return;
        animationRef.current = requestAnimationFrame(draw);
        analyserRef.current.getByteTimeDomainData(dataArrayRef.current);

        // Clear canvas with background
        canvasCtx.fillStyle = '#f6f7fb';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw center line
        canvasCtx.strokeStyle = '#e0e0e0';
        canvasCtx.lineWidth = 1;
        canvasCtx.beginPath();
        canvasCtx.moveTo(0, canvas.height / 2);
        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();

        // Draw waveform
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = '#667eea';
        canvasCtx.beginPath();

        const bufferLength = analyserRef.current.fftSize;
        const sliceWidth = (canvas.width * 1.0) / bufferLength;
        let x = 0;
        const centerY = canvas.height / 2;

        for (let i = 0; i < bufferLength; i++) {
          const v = (dataArrayRef.current[i] / 128.0) - 1.0; // Normalize to -1 to 1
          const y = centerY + (v * centerY * 0.8); // Scale to 80% of canvas height
          
          if (i === 0) {
            canvasCtx.moveTo(x, y);
          } else {
            canvasCtx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        canvasCtx.stroke();

        // Draw filled area under waveform
        canvasCtx.lineTo(canvas.width, centerY);
        canvasCtx.lineTo(0, centerY);
        canvasCtx.closePath();
        const gradient = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(102, 126, 234, 0.3)');
        gradient.addColorStop(1, 'rgba(102, 126, 234, 0.05)');
        canvasCtx.fillStyle = gradient;
        canvasCtx.fill();
      };
      draw();
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      };
    }

    // Clean up previous context if preview changed
    if (audioCtxRef.current && sourceKey !== currentPreviewKey) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
      dataArrayRef.current = null;
    }

    // Create new audio context and source
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    
    let source;
    try {
      source = audioCtx.createMediaElementSource(audioElement);
      // Mark this element with the current preview key
      audioElement.dataset.sourceKey = currentPreviewKey;
    } catch (error) {
      // If source already exists (shouldn't happen with our check, but just in case)
      console.warn('Audio source already exists, skipping visualization:', error);
      audioCtx.close().catch(() => {});
      return;
    }

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8; // Smooth transitions
    const bufferLength = analyser.frequencyBinCount; // Use frequencyBinCount for frequency data
    const dataArray = new Uint8Array(bufferLength);
    const frequencyData = new Uint8Array(bufferLength);

    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;
    dataArrayRef.current = dataArray;
    frequencyDataRef.current = frequencyData;
    
    // Make canvas responsive
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = 140 * dpr;
      canvasCtx.scale(dpr, dpr);
    };
    resizeCanvas();
    const resizeHandler = () => resizeCanvas();
    window.addEventListener('resize', resizeHandler);
    
    // Store handler for cleanup
    const cleanupResize = () => window.removeEventListener('resize', resizeHandler);

    const draw = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;
      
      animationRef.current = requestAnimationFrame(draw);
      
      // Get both time domain (waveform) and frequency domain data
      analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
      analyserRef.current.getByteFrequencyData(frequencyDataRef.current);

      // Clear canvas with background
      const displayWidth = canvas.width / (window.devicePixelRatio || 1);
      const displayHeight = canvas.height / (window.devicePixelRatio || 1);
      
      canvasCtx.fillStyle = '#f6f7fb';
      canvasCtx.fillRect(0, 0, displayWidth, displayHeight);

      // Draw center line
      canvasCtx.strokeStyle = '#e0e0e0';
      canvasCtx.lineWidth = 1;
      canvasCtx.beginPath();
      canvasCtx.moveTo(0, displayHeight / 2);
      canvasCtx.lineTo(displayWidth, displayHeight / 2);
      canvasCtx.stroke();

      // Analyze waveform for pause detection
      const silenceThreshold = 0.05; // Threshold for detecting silence (5% of max amplitude)
      let maxAmplitude = 0;
      let totalAmplitude = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = Math.abs((dataArrayRef.current[i] / 128.0) - 1.0);
        maxAmplitude = Math.max(maxAmplitude, v);
        totalAmplitude += v;
      }
      
      const avgAmplitude = totalAmplitude / bufferLength;
      const isCurrentlySilent = maxAmplitude < silenceThreshold;
      
      // Get current audio time
      const audioElement = audioElementRef.current;
      const currentTime = audioElement ? audioElement.currentTime : 0;
      const isPlaying = audioElement && !audioElement.paused && !audioElement.ended;
      
      // Pause detection logic
      if (isPlaying && currentTime !== null) {
        const detection = pauseDetectionRef.current;
        const now = Date.now();
        
        if (isCurrentlySilent) {
          if (!detection.isPaused) {
            // Start of a pause
            detection.isPaused = true;
            detection.pauseStartTime = currentTime;
          }
        } else {
          if (detection.isPaused && detection.pauseStartTime !== null) {
            // End of a pause - calculate duration
            const pauseDuration = currentTime - detection.pauseStartTime;
            if (pauseDuration > 0.1) { // Only count pauses longer than 100ms
              detection.pauses.push({
                startTime: detection.pauseStartTime,
                endTime: currentTime,
                durationMs: pauseDuration * 1000,
                durationSec: pauseDuration
              });
              
              // Update pause info state
              const totalPauseTime = detection.pauses.reduce((sum, p) => sum + p.durationSec, 0);
              setPauseInfo({
                pauseCount: detection.pauses.length,
                pauses: [...detection.pauses],
                totalPauseTimeMs: totalPauseTime * 1000,
                totalPauseTimeSec: totalPauseTime,
                currentPauseStart: null
              });
            }
            detection.isPaused = false;
            detection.pauseStartTime = null;
          }
        }
        
        // Update current pause if in progress
        if (detection.isPaused && detection.pauseStartTime !== null) {
          const currentPauseDuration = currentTime - detection.pauseStartTime;
          if (currentPauseDuration > 0.1) {
            setPauseInfo(prev => ({
              ...prev,
              currentPauseStart: detection.pauseStartTime,
              currentPauseDurationMs: currentPauseDuration * 1000,
              currentPauseDurationSec: currentPauseDuration
            }));
          }
        }
        
        detection.lastUpdateTime = currentTime;
      }

      // Draw waveform (time domain)
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = isCurrentlySilent ? '#ff6b6b' : '#667eea'; // Red when silent
      canvasCtx.beginPath();

      const sliceWidth = displayWidth / bufferLength;
      let x = 0;
      const centerY = displayHeight / 2;

      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArrayRef.current[i] / 128.0) - 1.0; // Normalize to -1 to 1
        const y = centerY + (v * centerY * 0.8); // Scale to 80% of canvas height
        
        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      canvasCtx.stroke();

      // Draw filled area under waveform for better visibility
      canvasCtx.lineTo(displayWidth, centerY);
      canvasCtx.lineTo(0, centerY);
      canvasCtx.closePath();
      const gradient = canvasCtx.createLinearGradient(0, 0, 0, displayHeight);
      gradient.addColorStop(0, isCurrentlySilent ? 'rgba(255, 107, 107, 0.2)' : 'rgba(102, 126, 234, 0.3)');
      gradient.addColorStop(1, isCurrentlySilent ? 'rgba(255, 107, 107, 0.05)' : 'rgba(102, 126, 234, 0.05)');
      canvasCtx.fillStyle = gradient;
      canvasCtx.fill();
    };

    draw();

    const resumeCtx = () => {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    };
    audioElementRef.current.addEventListener('play', resumeCtx);

    return () => {
      cleanupResize();
      if (audioElementRef.current) {
        audioElementRef.current.removeEventListener('play', resumeCtx);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (analyser) {
        analyser.disconnect();
      }
      if (source) {
        source.disconnect();
      }
      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }
      // Don't clear refs here - they might be reused
      // Only clear if audioPreview changes
    };
  }, [audioPreview]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!isValidAudioFile(file)) {
        onError('Please upload a valid audio file (MP3, WAV, OGG, M4A, MP4 or AAC)');
        return;
      }
      // Reset pause detection for new file
      pauseDetectionRef.current = {
        isPaused: false,
        pauseStartTime: null,
        pauses: [],
        lastUpdateTime: null
      };
      setPauseInfo(null);
      
      setAudioFile(file);
      setAudioPreview(URL.createObjectURL(file));
      onError(null);
    }
  };

  // Convert webm to wav using Web Audio API
  const convertWebmToWav = async (file) => {
    if (!file.type.includes('webm')) {
      return file; // Not a webm file, return as-is
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convert to WAV
      const wav = audioBufferToWav(audioBuffer);
      const blob = new Blob([wav], { type: 'audio/wav' });
      return new File([blob], file.name.replace(/\.webm$/i, '.wav'), { type: 'audio/wav' });
    } catch (error) {
      console.warn('WebM to WAV conversion failed, sending original file:', error);
      return file; // Fallback to original file
    }
  };

  // Helper function to convert AudioBuffer to WAV
  const audioBufferToWav = (buffer) => {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return arrayBuffer;
  };

  const handleAnalyze = async () => {
    if (!audioFile) {
      onError('Please select an audio file');
      return;
    }

    onLoading(true);
    onError(null);

    try {
      // Convert webm to wav if needed
      const fileToSend = await convertWebmToWav(audioFile);
      const result = await apiService.predictAudio(fileToSend, paragraph || null);
      
      // Process results
      onResults({
        type: 'audio',
        input: audioFile.name,
        prediction: result.prediction,
        confidence: result.confidence,
        features: result.features || {},
        transcription: result.transcription || null,
        filler_words: result.filler_words || [],
        filler_count: result.filler_count || 0,
        filler_words_list: result.filler_words_list || [],
        total_words: result.total_words || 0,
        text_similarity: result.text_similarity,
        is_valid: result.is_valid !== false
      });
    } catch (error) {
      onError(error.message);
      onResults(null);
    } finally {
      onLoading(false);
    }
  };

  // Microphone recording handlers
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        
        // Reset pause detection for new recording
        pauseDetectionRef.current = {
          isPaused: false,
          pauseStartTime: null,
          pauses: [],
          lastUpdateTime: null
        };
        setPauseInfo(null);
        
        setAudioFile(file);
        setAudioPreview(URL.createObjectURL(blob));
        // stop all tracks
        stream.getTracks().forEach((t) => t.stop());
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
      onError(null);
    } catch (err) {
      onError('Microphone access denied or unavailable.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleClear = () => {
    // Clean up audio context and source
    if (audioElementRef.current) {
      audioElementRef.current.dataset.sourceKey = '';
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    dataArrayRef.current = null;
    
    // Reset pause detection
    pauseDetectionRef.current = {
      isPaused: false,
      pauseStartTime: null,
      pauses: [],
      lastUpdateTime: null
    };
    setPauseInfo(null);
    
    setAudioFile(null);
    setAudioPreview(null);
    setParagraph(PARAGRAPHS[0] || '');
    onResults(null);
    onError(null);
  };

  return (
    <div className="audio-analysis">
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

      <div className="paragraph-section" style={{ marginTop: '1.5rem' }}>
        <label htmlFor="paragraph-select">
          📝 Choose a predefined paragraph for validation (required for context match):
        </label>
        <select
          id="paragraph-select"
          value={paragraph}
          onChange={(e) => setParagraph(e.target.value)}
          style={{
            width: '100%',
            padding: '0.6rem',
            borderRadius: '8px',
            border: '1px solid #e6e6e6',
            fontSize: '0.95rem',
            fontFamily: 'inherit',
            marginTop: '0.5rem',
            marginBottom: '0.5rem',
            background: '#fff'
          }}
        >
          {PARAGRAPHS.map((p, idx) => (
            <option key={idx} value={p}>
              Paragraph {idx + 1}
            </option>
          ))}
        </select>
        <div style={{
          background: '#f8f9fa',
          border: '1px solid #e6e6e6',
          borderRadius: '8px',
          padding: '0.75rem',
          fontSize: '0.95rem',
          lineHeight: 1.5,
          color: '#333'
        }}>
          {paragraph || PARAGRAPHS[0]}
        </div>
        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem', marginBottom: 0 }}>
          ℹ️ Evaluation will only proceed if the transcription matches this paragraph (60% similarity required).
        </p>
      </div>

      <div className="microphone-controls" style={{ marginTop: '1rem' }}>
        <label>Or record directly using your microphone:</label>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          {!isRecording ? (
            <button className="btn btn-primary" onClick={handleStartRecording}>🎙️ Start Recording</button>
          ) : (
            <button className="btn btn-secondary" onClick={handleStopRecording}>⏹ Stop Recording</button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: isRecording ? '#e74c3c' : '#bbb', display: 'inline-block' }} />
              <span style={{ fontSize: '0.95rem', color: '#333' }}>{isRecording ? `${recordingTime}s recording` : 'Not recording'}</span>
            </div>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => {
              // quick way to clear any recorded/selected audio
              setAudioFile(null);
              setAudioPreview(null);
              setParagraph(PARAGRAPHS[0] || '');
              onResults(null);
              onError(null);
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
          <audio key={audioPreview} controls src={audioPreview} ref={audioElementRef} />
          <div style={{ marginTop: '0.75rem' }}>
            <label style={{ display: 'block', fontWeight: 600, color: '#333', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
              📊 Waveform Visualization
            </label>
            <canvas
              ref={waveformCanvasRef}
              className="waveform-canvas"
              style={{ width: '100%', height: '140px' }}
            />
            {pauseInfo && pauseInfo.pauseCount > 0 && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '1rem', 
                background: '#f0f4ff', 
                borderRadius: '8px',
                border: '1px solid #667eea'
              }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#333', fontSize: '0.95rem', fontWeight: 600 }}>
                  ⏸️ Pause Detection Results
                </h4>
                <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div>
                    <strong>Total Pauses:</strong> {pauseInfo.pauseCount}
                  </div>
                  <div>
                    <strong>Total Pause Time:</strong> {pauseInfo.totalPauseTimeMs.toFixed(0)} ms ({pauseInfo.totalPauseTimeSec.toFixed(2)} seconds)
                  </div>
                  {pauseInfo.currentPauseStart !== null && pauseInfo.currentPauseDurationMs && (
                    <div style={{ color: '#ff6b6b', fontWeight: 600 }}>
                      <strong>Current Pause:</strong> {pauseInfo.currentPauseDurationMs.toFixed(0)} ms ({pauseInfo.currentPauseDurationSec.toFixed(2)} seconds)
                    </div>
                  )}
                  {pauseInfo.pauses.length > 0 && (
                    <details style={{ marginTop: '0.5rem' }}>
                      <summary style={{ cursor: 'pointer', color: '#667eea', fontWeight: 500 }}>
                        View Individual Pauses ({pauseInfo.pauses.length})
                      </summary>
                      <div style={{ marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                        {pauseInfo.pauses.map((pause, idx) => (
                          <div key={idx} style={{ 
                            padding: '0.5rem', 
                            marginBottom: '0.25rem', 
                            background: 'white', 
                            borderRadius: '4px',
                            fontSize: '0.85rem'
                          }}>
                            <strong>Pause {idx + 1}:</strong> {pause.durationMs.toFixed(0)} ms ({pause.durationSec.toFixed(2)}s) 
                            <span style={{ color: '#666', marginLeft: '0.5rem' }}>
                              [{pause.startTime.toFixed(2)}s - {pause.endTime.toFixed(2)}s]
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )}
          </div>
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
          disabled={!audioFile}
        >
          🎤 Analyze Audio
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
