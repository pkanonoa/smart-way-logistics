import api from './authApi';

export const getBookingsReport = async (params) => {
  const response = await api.get('/reports/bookings', { params });
  return response.data;
};

export const getSendersReport = async (id) => {
  const response = await api.get(`/reports/senders/${id}`);
  return response.data;
};

export const getPendingPaymentsReport = async () => {
  const response = await api.get('/reports/pending-payments');
  return response.data;
};

export const getParcelsReport = async (status) => {
  const response = await api.get('/reports/parcels', { params: { status } });
  return response.data;
};

export const getStaffReport = async (id) => {
  const response = await api.get(`/reports/staff/${id}`);
  return response.data;
};

export const getVehiclesReport = async (id) => {
  const response = await api.get(`/reports/vehicles/${id}`);
  return response.data;
};

export const getExpensesReport = async (params) => {
  const response = await api.get('/reports/expenses', { params });
  return response.data;
};

export const getIncomeReport = async (params) => {
  const response = await api.get('/reports/income', { params });
  return response.data;
};

export const downloadReportBlob = async (endpoint, params, format) => {
  const response = await api.get(endpoint, {
    params: { ...params, format },
    responseType: 'blob'
  });
  return response.data;
};
