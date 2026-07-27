import api from './authApi';

export async function getDailyCollections({ startDate, endDate, vehicleId } = {}) {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (vehicleId) params.vehicleId = vehicleId;

  const { data } = await api.get('/daily-collections', { params });
  return data.collections;
}

export async function getDailyCollection(id) {
  const { data } = await api.get(`/daily-collections/${id}`);
  return data.collection;
}

export async function createDailyCollection(payload) {
  const { data } = await api.post('/daily-collections', payload);
  return data.collection;
}

export async function updateDailyCollection(id, payload) {
  const { data } = await api.put(`/daily-collections/${id}`, payload);
  return data.collection;
}

export async function deleteDailyCollection(id) {
  const { data } = await api.delete(`/daily-collections/${id}`);
  return data;
}
