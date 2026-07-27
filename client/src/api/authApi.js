import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Automatically attach JWT token to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('swl_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Auth API ────────────────────────────────────────────────────────────────

export async function loginUser({ phone, password }) {
  const { data } = await api.post('/auth/login', { phone, password });
  return data; // { token, user, message }
}

export async function registerUser({ name, phone, password, role }) {
  const { data } = await api.post('/auth/register', { name, phone, password, role });
  return data;
}

export async function getMe() {
  const { data } = await api.get('/auth/me');
  return data; // { user }
}

export default api;
