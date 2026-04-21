import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SessionFlow from './pages/SessionFlow';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold tracking-wider">
              AI
            </div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Clinical Cognition Screener</h1>
          </div>
          <nav className="text-sm font-medium text-slate-500">
            Official Healthcare Portal
          </nav>
        </header>

        <main className="flex-1 w-full max-w-6xl mx-auto p-6 md:p-10 flex flex-col">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/session/:userId" element={<SessionFlow />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
