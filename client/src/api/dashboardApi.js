import api from './authApi';

export const getDashboardSummary = async () => {
  const response = await api.get('/dashboard/summary');
  return response.data;
};

export const searchDashboard = async (q) => {
  const response = await api.get('/dashboard/search', { params: { q } });
  return response.data.results;
};
