import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('swl_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function getActivityLogs({ module, recordId }) {
  const params = {};
  if (module) params.module = module;
  if (recordId) params.recordId = recordId;
  const { data } = await api.get('/activity-logs', { params });
  return data.logs;
}
