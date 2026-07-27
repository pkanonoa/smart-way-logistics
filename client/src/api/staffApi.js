import api from './authApi';

// ─── List / Search ────────────────────────────────────────────────────────────

export async function getstaffs(search = '') {
  const params = search ? { search } : {};
  const { data } = await api.get('/staff', { params });
  return data.staffs; // staff[]
}

// ─── Single ───────────────────────────────────────────────────────────────────

export async function getstaff(id) {
  const { data } = await api.get(`/staff/${id}`);
  return data.staff;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createstaff(payload) {
  const { data } = await api.post('/staff', payload);
  return data.staff;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updatestaff(id, payload) {
  const { data } = await api.put(`/staff/${id}`, payload);
  return data.staff;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deletestaff(id) {
  const { data } = await api.delete(`/staff/${id}`);
  return data;
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export async function getAttendance(staff_id, date) {
  const params = {};
  if (staff_id) params.staff_id = staff_id;
  if (date) params.date = date;
  
  const { data } = await api.get('/attendance', { params });
  return data.attendance;
}

export async function markAttendance(payload) {
  const { data } = await api.post('/attendance', payload);
  return data.attendance;
}
