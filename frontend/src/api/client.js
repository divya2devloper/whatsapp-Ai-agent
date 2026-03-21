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

export const exportLeads = () => api.get('/api/leads/export', { responseType: 'blob' });
export const importLeads = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/api/leads/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Properties
export const getProperties = (params) => api.get('/api/properties', { params });
export const createProperty = (formData) => api.post('/api/properties', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const updateProperty = (id, formData) => api.put(`/api/properties/${id}`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const deleteProperty = (id) => api.delete(`/api/properties/${id}`);
export const exportProperties = () => api.get('/api/properties/export', { responseType: 'blob' });
export const importProperties = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/api/properties/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Appointments
export const getAppointments = (params) => api.get('/api/appointments', { params });
export const createAppointment = (data) => api.post('/api/appointments', data);
export const updateAppointment = (id, data) =>
  api.put(`/api/appointments/${id}`, data);
export const deleteAppointment = (id) => api.delete(`/api/appointments/${id}`);

export const exportAppointments = () => api.get('/api/appointments/export', { responseType: 'blob' });
export const importAppointments = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/api/appointments/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Helper to trigger download
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(new Blob([blob]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

// Stats
export const getStats = () => api.get('/api/stats');

// Settings
export const getSettings = () => api.get('/api/settings');
export const updateSettings = (data) => api.put('/api/settings', data);

// --- Training API ---
export const getSystemPrompt = () => api.get('/api/training/prompt');
export const updateSystemPrompt = (prompt) => api.post('/api/training/prompt', { prompt });

export const getQAPairs = () => api.get('/api/training/qa');
export const addQAPair = (data) => api.post('/api/training/qa', data);
export const deleteQAPair = (id) => api.delete(`/api/training/qa/${id}`);

export const getDocuments = () => api.get('/api/training/documents');
export const deleteDocument = (id) => api.delete(`/api/training/documents/${id}`);
export const uploadDocument = (fileData, onUploadProgress) => 
  api.post('/api/training/documents/upload', fileData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress
  });

export default api;
