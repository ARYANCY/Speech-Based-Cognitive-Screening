import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
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
  predictAudio: async (audioFile, paragraph = null) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      if (paragraph && paragraph.trim()) {
        formData.append('paragraph', paragraph.trim());
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
