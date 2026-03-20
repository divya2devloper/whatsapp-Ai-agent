import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 15000,
});

// Leads
export const getLeads = (params) => api.get('/api/leads', { params });
export const getLead = (phone) => api.get(`/api/leads/${encodeURIComponent(phone)}`);
export const updateLead = (phone, data) =>
  api.put(`/api/leads/${encodeURIComponent(phone)}`, data);
export const deleteLead = (phone) =>
  api.delete(`/api/leads/${encodeURIComponent(phone)}`);

// Properties
export const getProperties = (params) => api.get('/api/properties', { params });
export const createProperty = (data) => api.post('/api/properties', data);
export const updateProperty = (id, data) => api.put(`/api/properties/${id}`, data);
export const deleteProperty = (id) => api.delete(`/api/properties/${id}`);

// Appointments
export const getAppointments = (params) => api.get('/api/appointments', { params });
export const updateAppointment = (id, data) =>
  api.put(`/api/appointments/${id}`, data);
export const deleteAppointment = (id) => api.delete(`/api/appointments/${id}`);

// Stats
export const getStats = () => api.get('/api/stats');

// Settings
export const getSettings = () => api.get('/api/settings');
export const updateSettings = (data) => api.put('/api/settings', data);

export default api;
