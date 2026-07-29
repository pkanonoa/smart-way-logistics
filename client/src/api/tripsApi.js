import api from './authApi';

export const getUnassignedGroups = async () => {
  const response = await api.get('/trips/unassigned-groups');
  return response.data.groups;
};

export const assignTrip = async (data) => {
  const response = await api.post('/trips/assign', data);
  return response.data.trip;
};
