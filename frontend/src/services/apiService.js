import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Get session ID from localStorage
const getSessionId = () => {
  return localStorage.getItem('sessionId');
};

// Set session ID in localStorage
const setSessionId = (sessionId) => {
  if (sessionId) {
    localStorage.setItem('sessionId', sessionId);
  } else {
    localStorage.removeItem('sessionId');
  }
};

// Add session ID to requests
api.interceptors.request.use((config) => {
  const sessionId = getSessionId();
  if (sessionId) {
    config.headers['x-session-id'] = sessionId;
  }
  return config;
});

export const apiService = {
  // Health check
  checkHealth: async () => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      throw new Error('Failed to connect to API');
    }
  },

  // Authentication
  signup: async (name, email) => {
    try {
      const response = await api.post('/auth/signup', { name, email });
      if (response.data.sessionId) {
        setSessionId(response.data.sessionId);
      }
      return response.data;
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Signup failed');
    }
  },

  login: async (email) => {
    try {
      const response = await api.post('/auth/login', { email });
      if (response.data.sessionId) {
        setSessionId(response.data.sessionId);
      }
      return response.data;
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Login failed');
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      setSessionId(null);
      return null;
    }
  },

  logout: () => {
    setSessionId(null);
  },

  // Get results summary
  getResultsSummary: async () => {
    try {
      const response = await api.get('/results/summary');
      return response.data;
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Failed to get results summary');
    }
  },

  // Predict from text
  predictText: async (text) => {
    try {
      const response = await api.post('/predict/text', { text });
      return response.data;
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Failed to process text prediction');
    }
  },

  // Predict from audio
  predictAudio: async (audioFile, originalText = null, hintText = null) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      
      // Add memory test parameters if provided
      if (originalText) {
        formData.append('original_text', originalText);
      }
      if (hintText) {
        formData.append('hint_text', hintText);
      }

      // Don't set Content-Type header - let axios handle it automatically
      const response = await api.post('/predict/audio', formData);
      return response.data;
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Failed to process audio prediction');
    }
  },
};

export default apiService;
