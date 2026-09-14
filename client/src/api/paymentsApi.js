import api from './authApi';

export const getPendingPayments = async () => {
  const response = await api.get('/payments/pending');
  return response.data.payments;
};

export const getSenderPaymentHistory = async (senderId) => {
  const response = await api.get(`/senders/${senderId}/payments`);
  return response.data.payments;
};

export const settlePayment = async (id, paymentMethod) => {
  const response = await api.put(`/payments/${id}/settle`, { payment_method: paymentMethod });
  return response.data.payment;
};

// ─── For PaymentsLedgerPage (merged inflow / outflow) ────────────────────────

export const getCollections = (query = {}) =>
  api.get('/daily-collections', { params: query }).then(r => r.data.collections);

export const getAllPayments = (query = {}) =>
  api.get('/payments', { params: query }).then(r => r.data.payments);
