import api from './authApi';

// ─── Generate ───────────────────────────────────────────────────────────────────

export async function generateSalariesDraft(week_start_date, week_end_date) {
  const { data } = await api.post('/salaries/generate-draft', { week_start_date, week_end_date });
  return data.drafts;
}

export async function generateSalariesConfirm(week_start_date, week_end_date, rows) {
  const { data } = await api.post('/salaries/generate-confirm', { week_start_date, week_end_date, rows });
  return data;
}

// ─── List / Summary ─────────────────────────────────────────────────────────────

export async function getSalariesSummary() {
  const { data } = await api.get('/salaries');
  return data.staff;
}

export async function getStaffSalarySummary(staff_id, startDate = '', endDate = '') {
  const params = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  const { data } = await api.get(`/salaries/staff/${staff_id}`, { params });
  return data; // { staff, total_balance, weeks }
}

// ─── Adjustments & Payments ─────────────────────────────────────────────────────

export async function addSalaryAdjustment(salary_week_id, payload) {
  // payload: { type, amount, reason }
  const { data } = await api.post(`/salaries/weeks/${salary_week_id}/adjustments`, payload);
  return data.adjustment;
}

export async function deleteSalaryAdjustment(adjustment_id) {
  const { data } = await api.delete(`/salaries/adjustments/${adjustment_id}`);
  return data;
}

export async function updateSalaryAdjustment(adjustment_id, payload) {
  // payload: { amount, reason }
  const { data } = await api.put(`/salaries/adjustments/${adjustment_id}`, payload);
  return data.adjustment;
}

export async function recordSalaryPayment(salary_week_id, payload) {
  // payload: { amount, payment_date, notes }
  const { data } = await api.post(`/salaries/weeks/${salary_week_id}/pay`, payload);
  return data.payment;
}

export async function deleteSalaryPayment(payment_id) {
  const { data } = await api.delete(`/salaries/payments/${payment_id}`);
  return data;
}

export async function updateSalaryWeekBaseAmount(salary_week_id, base_amount) {
  const { data } = await api.put(`/salaries/weeks/${salary_week_id}/base`, { base_amount });
  return data.week;
}

export async function deleteSalaryWeek(salary_week_id) {
  const { data } = await api.delete(`/salaries/weeks/${salary_week_id}`);
  return data;
}

// ─── Advances ───────────────────────────────────────────────────────────────────

export async function getStaffAdvances(staff_id) {
  const { data } = await api.get(`/salaries/advances/staff/${staff_id}`);
  return data.advances;
}

export async function createStaffAdvance(staff_id, payload) {
  // payload: { amount, date, reason }
  const { data } = await api.post(`/salaries/advances/staff/${staff_id}`, payload);
  return data.advance;
}

export async function deleteStaffAdvance(advance_id) {
  const { data } = await api.delete(`/salaries/advances/${advance_id}`);
  return data;
}
