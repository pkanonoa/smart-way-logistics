import api from './authApi';

export const getVehicles = async (query = '') => {
  const params = query ? { q: query } : {};
  const response = await api.get(`/vehicles`, { params });
  return response.data.vehicles;
};

export const getVehicle = async (id) => {
  const response = await api.get(`/vehicles/${id}`);
  return response.data.vehicle;
};

export const createVehicle = async (data) => {
  const response = await api.post(`/vehicles`, data);
  return response.data.vehicle;
};

export const updateVehicle = async (id, data) => {
  const response = await api.put(`/vehicles/${id}`, data);
  return response.data.vehicle;
};

export const deleteVehicle = async (id) => {
  const response = await api.delete(`/vehicles/${id}`);
  return response.data;
};
