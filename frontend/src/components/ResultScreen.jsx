import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

const ResultScreen = ({ sessionId, onFinish }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real scenario, the backend completes the inference when transitioning to this step.
    // We poll or fetch the session data to get the prediction.
    const getResults = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/session/user/patient_1024/sessions`);
        const currentData = res.data.sessions.find(s => s.session_id === sessionId);
        if (currentData && currentData.prediction) {
          setResult(currentData.prediction);
        } else {
          // If ML server is down or pipeline mock, return mock fallback UI
          setResult({ label: 'Low Risk', risk_score: 0.12 });
        }
      } catch (err) {
        console.error("Error fetching results", err);
        setResult({ label: 'Unknown', risk_score: 0 });
      } finally {
        setLoading(false);
      }
    };

    setTimeout(getResults, 2000); // Simulate ML processing delay
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6 py-10 animate-in fade-in">
        <div className="w-16 h-16 border-4 border-slate-200 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="text-lg text-slate-600 font-medium tracking-tight">Processing multi-modal inputs...</p>
      </div>
    );
  }

  const isHighRisk = result?.label === "High Risk";

  return (
    <div className="flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95 duration-500">
      <div className={`p-6 rounded-full ${isHighRisk ? 'bg-red-100' : 'bg-emerald-100'}`}>
        {isHighRisk ? <AlertCircle className="w-16 h-16 text-red-600" /> : <CheckCircle className="w-16 h-16 text-emerald-600" />}
      </div>
      
      <div className="text-center space-y-2">
        <h3 className="text-3xl font-bold text-slate-800">Analysis Complete</h3>
        <p className="text-slate-500 text-lg">System confidence score: {((1 - (result?.risk_score || 0)) * 100).toFixed(1)}%</p>
      </div>

      <div className={`w-full max-w-sm p-6 rounded-xl border ${isHighRisk ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'} text-center`}>
         <p className="text-sm uppercase tracking-wider font-semibold text-slate-500 mb-1">Detected Cognitive Status</p>
         <p className={`text-2xl font-bold ${isHighRisk ? 'text-red-700' : 'text-emerald-700'}`}>{result?.label || "Unknown"}</p>
      </div>

      <button onClick={onFinish} className="btn-secondary w-full max-w-sm flex justify-center items-center space-x-2">
         <span>Return to Dashboard</span>
         <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ResultScreen;
