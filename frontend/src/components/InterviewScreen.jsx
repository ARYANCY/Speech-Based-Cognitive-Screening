import React, { useState } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

const InterviewScreen = ({ onComplete, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");

  const handleToggleRecord = () => {
    if (!isRecording) {
      setIsRecording(true);
      // Mocking transcription generation instead of real whisper hook for flow
    } else {
      setIsRecording(false);
      setTranscript("Patient mentioned recurring memory loss and difficulty identifying familiar places.");
    }
  };

  const submitInterview = () => {
    onComplete({ transcript, audio_path: null });
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-semibold text-slate-800">Voice Interview Module</h3>
        <p className="text-slate-500">Allow the AI assistant to conduct a brief cognitive interview.</p>
      </div>

      <button 
        onClick={handleToggleRecord}
        className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${isRecording ? 'bg-red-500 animate-pulse text-white' : 'bg-primary-50 text-primary-600 hover:bg-primary-100'}`}
      >
        {isRecording ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
      </button>

      {isRecording && <p className="text-red-500 font-medium">Recording in progress...</p>}
      
      {transcript && !isRecording && (
        <div className="w-full max-w-lg p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-sm font-semibold text-slate-700 mb-1">Generated Transcript:</p>
          <p className="text-slate-600 italic">"{transcript}"</p>
        </div>
      )}

      {transcript && !isRecording && (
         <button onClick={submitInterview} disabled={isProcessing} className="btn-primary flex items-center space-x-2">
           {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
           <span>{isProcessing ? "Saving..." : "Proceed to Cognitive Game"}</span>
         </button>
      )}
    </div>
  );
};

export default InterviewScreen;
