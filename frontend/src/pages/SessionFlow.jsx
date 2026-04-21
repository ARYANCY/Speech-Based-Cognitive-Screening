import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProgressBar from '../components/ProgressBar';
import InterviewScreen from '../components/InterviewScreen';
import GameScreen from '../components/GameScreen';
import ResultScreen from '../components/ResultScreen';
import axios from 'axios';

const steps = ["Setup", "Interview", "Cognitive Game", "Analysis & Results"];

const SessionFlow = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Initiate session on load
    const startSession = async () => {
      try {
        const res = await axios.post('http://localhost:5000/session/start', { user_id: userId });
        setSessionId(res.data.session.session_id);
      } catch (err) {
        console.error("Failed to start session:", err);
      }
    };
    startSession();
  }, [userId]);

  const handleNext = async (stepData) => {
    if (!sessionId) return;
    setIsProcessing(true);

    try {
      if (currentStep === 1) {
        await axios.post(`http://localhost:5000/session/${sessionId}/interview`, stepData);
      } else if (currentStep === 2) {
        await axios.post(`http://localhost:5000/session/${sessionId}/game`, stepData);
        // Start completing session, processing analysis immediately after the game.
        setCurrentStep(3);
        const finalRes = await axios.post(`http://localhost:5000/session/${sessionId}/complete`, {});
        // Here we could pass final results down to the ResultScreen.
        return; 
      }
      
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinish = () => {
    navigate('/dashboard');
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center">
      <div className="w-full max-w-4xl px-4 py-8">
        <h2 className="text-2xl font-semibold text-slate-800 mb-8 text-center text-balance">
          Cognitive Assessment Session
        </h2>
        <ProgressBar currentStep={currentStep} totalSteps={steps.length} stepLabels={steps} />
      </div>

      <div className="w-full max-w-4xl card p-8 md:p-12 min-h-[400px] flex flex-col justify-center">
        {currentStep === 0 && (
          <div className="text-center space-y-6">
            <h3 className="text-xl font-medium text-slate-900">Ensure optimal conditions</h3>
            <p className="text-slate-600 max-w-xl mx-auto leading-relaxed">
              Before proceeding, please verify that your microphone and camera are functional. Ensure the patient is seated in a well-lit, quiet environment free from distractions.
            </p>
            <button onClick={() => setCurrentStep(1)} className="btn-primary mt-6">
              Acknowledge & Begin Interview
            </button>
          </div>
        )}

        {currentStep === 1 && (
          <InterviewScreen onComplete={(data) => handleNext(data)} isProcessing={isProcessing} />
        )}

        {currentStep === 2 && (
          <GameScreen onComplete={(data) => handleNext(data)} isProcessing={isProcessing} />
        )}

        {currentStep === 3 && (
          <ResultScreen sessionId={sessionId} onFinish={handleFinish} />
        )}
      </div>
    </div>
  );
};

export default SessionFlow;
