import React, { useState } from 'react';
import { Target, Loader2 } from 'lucide-react';

const GameScreen = ({ onComplete, isProcessing }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [complete, setComplete] = useState(false);

  const startGame = () => {
    setIsPlaying(true);
    // Mock a 3 second gameplay
    setTimeout(() => {
      setIsPlaying(false);
      setComplete(true);
    }, 3000);
  };

  const submitGame = () => {
    onComplete({
      scores: {
        accuracy: Math.random() * 0.5 + 0.5, // 0.5 - 1.0 mock
        reaction_time: Math.random() * 1.5 + 0.5 // 0.5s - 2.0s
      },
      raw_logs: { completed_at: new Date() }
    });
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-semibold text-slate-800">Visual Cognitive Game</h3>
        <p className="text-slate-500">Patient interacts with spatial recognition logic sequences.</p>
      </div>

      {!isPlaying && !complete && (
        <button onClick={startGame} className="btn-primary flex flex-col items-center justify-center w-40 h-40 rounded-2xl shadow-lg ring-4 ring-primary-100">
           <Target className="w-12 h-12 mb-2" />
           Start Sequence
        </button>
      )}

      {isPlaying && (
        <div className="flex flex-col items-center space-y-4">
          <div className="w-32 h-32 border-4 border-dashed border-primary-500 rounded-full animate-spin-slow"></div>
          <p className="text-slate-600 font-medium">Tracking interaction parameters...</p>
        </div>
      )}

      {complete && (
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full mb-2">
            <Target className="w-10 h-10" />
          </div>
          <p className="text-lg font-medium text-emerald-700">Sequence Completed Successfully</p>
          <button onClick={submitGame} disabled={isProcessing} className="btn-primary w-full flex items-center justify-center space-x-2">
             {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
             <span>{isProcessing ? "Analyzing Session..." : "Finalize Assessment"}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default GameScreen;
