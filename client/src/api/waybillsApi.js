import api from './authApi';

export const getWaybills = async (query = {}) => {
  const response = await api.get('/waybills', { params: query });
  return response.data.waybills;
};

export const getWaybill = async (id) => {
  const response = await api.get(`/waybills/${id}`);
  return response.data.waybill;
};

export const createWaybill = async (data) => {
  const response = await api.post('/waybills', data);
  return response.data.waybill;
};

export const updateWaybill = async (id, data) => {
  const response = await api.put(`/waybills/${id}`, data);
  return response.data.waybill;
};

export const deleteWaybill = async (id) => {
  const response = await api.delete(`/waybills/${id}`);
  return response.data;
};
