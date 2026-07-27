import api from './authApi';

export async function getDailyLogs(date) {
  const { data } = await api.get('/daily-logs', { params: { date } });
  return data;
}

export async function recordDailyEarning(payload) {
  // payload: { staff_id, date, amount }
  const { data } = await api.post('/daily-logs/earnings', payload);
  return data;
}
