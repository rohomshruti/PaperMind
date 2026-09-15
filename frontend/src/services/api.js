import axios from 'axios';

const API_BASE_URL = 'https://papermind-backend-h7y6.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60s timeout for RAG / LLM generation
});

export const getHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const getDashboardStats = async () => {
  const response = await api.get('/papers/stats/dashboard');
  return response.data;
};

export const getPapers = async () => {
  const response = await api.get('/papers');
  return response.data;
};

export const uploadPapers = async (files) => {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }
  const response = await api.post('/papers/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deletePaper = async (paperId) => {
  const response = await api.delete(`/papers/${paperId}`);
  return response.data;
};

export const sendChatMessage = async ({ question, history = [], paper_ids = null }) => {
  const response = await api.post('/chat', {
    question,
    history,
    paper_ids,
  });
  return response.data;
};

export const getPaperSummary = async (paperId) => {
  const response = await api.post(`/papers/${paperId}/summary`);
  return response.data;
};

export const comparePapers = async (paperIds) => {
  const response = await api.post('/papers/compare', {
    paper_ids: paperIds,
  });
  return response.data;
};

export default api;
