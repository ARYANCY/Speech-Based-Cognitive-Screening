import React, { useState } from 'react';
import apiService from '../services/apiService';
import './Auth.css';

function Auth({ onLogin, onError }) {
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      onError('Email is required');
      return;
    }

    if (!isLogin && !name.trim()) {
      onError('Name is required');
      return;
    }

    setLoading(true);
    onError(null);

    try {
      let result;
      if (isLogin) {
        result = await apiService.login(email.trim());
      } else {
        result = await apiService.signup(name.trim(), email.trim());
      }

      if (result.user) {
        onLogin(result.user);
      }
    } catch (error) {
      onError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">{isLogin ? 'Login' : 'Sign Up'}</h2>
        <p className="auth-subtitle">
          {isLogin 
            ? 'Enter your email to continue' 
            : 'Create an account to track your analysis history'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="auth-field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
                disabled={loading}
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <div className="auth-switch">
          <span>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
          </span>
          <button
            type="button"
            className="auth-switch-btn"
            onClick={() => {
              setIsLogin(!isLogin);
              onError(null);
            }}
            disabled={loading}
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Auth;

