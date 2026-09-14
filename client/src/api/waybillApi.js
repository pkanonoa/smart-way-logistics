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

export async function fetchWaybillPdfBlob(id, isDuplicate = false) {
  const url = `/waybills/${id}/pdf${isDuplicate ? '?copy=duplicate' : ''}`;
  const response = await api.get(url, { responseType: 'blob' });
  return new Blob([response.data], { type: 'application/pdf' });
}

export async function downloadWaybillPdf(id, isDuplicate = false) {
  const blob = await fetchWaybillPdfBlob(id, isDuplicate);
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = isDuplicate ? `waybill-DUPLICATE.pdf` : `waybill.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return blob;
}
