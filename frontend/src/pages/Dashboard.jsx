import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Play, Activity, Clock, User } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const mockUserId = "patient_1024";

  useEffect(() => {
    // Fetch completed sessions
    const fetchSessions = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/session/user/${mockUserId}/sessions`);
        setSessions(res.data.sessions || []);
      } catch (err) {
        console.error("Error fetching sessions", err);
      }
    };
    fetchSessions();
  }, []);

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Patient Dashboard</h2>
          <p className="text-slate-500 mt-1">Manage and track cognitive clinical sessions.</p>
        </div>
        <button onClick={() => navigate(`/session/${mockUserId}`)} className="btn-primary mt-4 md:mt-0 flex items-center space-x-2">
          <Play className="w-4 h-4" />
          <span>New Assessment</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Stats Placeholder */}
        <div className="card p-6 flex flex-col justify-center">
          <div className="flex items-center space-x-3 text-slate-600 mb-2">
            <Activity className="w-5 h-5 text-primary-500" />
            <h3 className="font-semibold">Total Sessions</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">{sessions.length}</p>
        </div>
        <div className="card p-6 flex flex-col justify-center">
          <div className="flex items-center space-x-3 text-slate-600 mb-2">
            <User className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold">Risk Average</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">Low</p>
        </div>
        <div className="card p-6 flex flex-col justify-center">
          <div className="flex items-center space-x-3 text-slate-600 mb-2">
            <Clock className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold">Last Assessment</h3>
          </div>
          <p className="text-xl font-bold text-slate-800">{sessions.length > 0 ? new Date(sessions[0].timestamp).toLocaleDateString() : 'N/A'}</p>
        </div>
      </div>

      <div className="card p-0 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">History Log</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {sessions.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No sessions recorded yet. Start a new assessment.</div>
          ) : (
            sessions.map((session, i) => (
               <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                 <div>
                   <p className="font-medium text-slate-800">Session ID: <span className="text-slate-500 font-normal">{session.session_id}</span></p>
                   <p className="text-sm text-slate-500">{new Date(session.timestamp).toLocaleString()}</p>
                 </div>
                 <div>
                   {session.prediction?.label ? (
                     <span className={`px-3 py-1 text-sm font-medium rounded-full ${session.prediction.label === 'High Risk' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                       {session.prediction.label}
                     </span>
                   ) : (
                     <span className="px-3 py-1 text-sm font-medium rounded-full bg-slate-100 text-slate-600">Pending</span>
                   )}
                 </div>
               </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
