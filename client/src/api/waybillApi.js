import api from './authApi';

export async function createWaybill(payload) {
  const { data } = await api.post('/waybills', payload);
  return data.waybill;
}

export async function getWaybills({ search, status, customerId, startDate, endDate } = {}) {
  const params = {};
  if (search)     params.search     = search;
  if (status)     params.status     = status;
  if (customerId) params.customerId = customerId;
  if (startDate)  params.startDate  = startDate;
  if (endDate)    params.endDate    = endDate;
  const { data } = await api.get('/waybills', { params });
  return data.waybills;
}

export async function getWaybill(id) {
  const { data } = await api.get(`/waybills/${id}`);
  return data.waybill;
}

export const updateWaybill = async (id, data) => {
  const response = await api.put(`/waybills/${id}`, data);
  return response.data.waybill;
};

export const updateWaybillStatus = async (id, payload) => {
  const response = await api.post(`/waybills/${id}/status`, payload);
  return response.data; // { waybill, tracking, suggestPaymentCollected }
};

export const getWaybillTracking = async (id) => {
  const response = await api.get(`/waybills/${id}/tracking`);
  return response.data.tracking;
};

export const getPublicTracking = async (waybill_number) => {
  const response = await api.get(`/public/track/${waybill_number}`);
  return response.data.waybill;
};

export async function deleteWaybill(id) {
  const { data } = await api.delete(`/waybills/${id}`);
  return data;
}

export async function downloadWaybillPdf(id, isDuplicate = false) {
  const url = `/waybills/${id}/pdf${isDuplicate ? '?copy=duplicate' : ''}`;
  const response = await api.get(url, { responseType: 'blob' });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = isDuplicate ? `waybill-DUPLICATE.pdf` : `waybill.pdf`;
  link.click();
  URL.revokeObjectURL(link.href);
}
