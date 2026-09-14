import api from './authApi';

// ─── Legacy (kept for backward-compat with old AssignTripsPage) ───────────────

export const getUnassignedGroups = async () => {
  const response = await api.get('/trips/unassigned-groups');
  return response.data.groups;
};

export const assignTrip = async (data) => {
  const response = await api.post('/trips/assign', data);
  return response.data.trip;
};

// ─── Badge counts ─────────────────────────────────────────────────────────────

export const getTripBadgeCounts = () =>
  api.get('/trips/badge-counts').then(r => r.data);

// ─── Unassigned waybills for trip builder pool ────────────────────────────────

export const getUnassignedWaybillsByDistrict = (district = '') =>
  api.get('/trips/unassigned-waybills', { params: { district } }).then(r => r.data.waybills);

// ─── Trip CRUD ────────────────────────────────────────────────────────────────

export const getTrips = (query = {}) =>
  api.get('/trips', { params: query }).then(r => r.data.trips);

export const getTrip = (id) =>
  api.get(`/trips/${id}`).then(r => r.data.trip);

export const createTrip = (data) =>
  api.post('/trips', data).then(r => r.data.trip);

export const updateTrip = (id, data) =>
  api.put(`/trips/${id}`, data).then(r => r.data.trip);

export const deleteTrip = (id) =>
  api.delete(`/trips/${id}`).then(r => r.data);

// ─── Waybill → Trip assignment (merge-by-location on server) ─────────────────
// After this call, replace local optimistic stop state with the returned trip.

export const addWaybillToTrip = (tripId, waybillId, weight) =>
  api.post(`/trips/${tripId}/add-waybill`, { waybillId, weight }).then(r => r.data.trip);

// ─── Stop management ──────────────────────────────────────────────────────────

export const reorderStop = (tripId, stopId, direction) =>
  api.put(`/trips/${tripId}/stops/${stopId}/reorder`, { direction }).then(r => r.data.trip);

export const removeStop = (tripId, stopId) =>
  api.delete(`/trips/${tripId}/stops/${stopId}`).then(r => r.data.trip);
