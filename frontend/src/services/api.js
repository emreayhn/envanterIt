import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api/v1',
    headers: { 'Content-Type': 'application/json' },
});

// Attach MSAL token if available
api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('msal_access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ── Computers ───────────────────────────────────────────
export const getComputers = (params) => api.get('/computers', { params });
export const getComputer = (id) => api.get(`/computers/${id}`);
export const createComputer = (data) => api.post('/computers', data);
export const updateComputer = (id, data) => api.put(`/computers/${id}`, data);
export const deleteComputer = (id) => api.delete(`/computers/${id}`);
export const getComputerAssignments = (id) => api.get(`/computers/${id}/assignments`);
export const bulkCreateComputers = (items) => api.post('/computers/bulk', items);

// ── Employees ───────────────────────────────────────────
export const getEmployees = (params) => api.get('/employees', { params });
export const createEmployee = (data) => api.post('/employees', data);
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data);
export const deleteEmployee = (id) => api.delete(`/employees/${id}`);

// ── Licenses ────────────────────────────────────────────
export const getLicenses = (params) => api.get('/licenses', { params });
export const createLicense = (data) => api.post('/licenses', data);
export const updateLicense = (id, data) => api.put(`/licenses/${id}`, data);
export const deleteLicense = (id) => api.delete(`/licenses/${id}`);

// ── License Assignments ─────────────────────────────────
export const assignLicenses = (data) => api.post('/license-assignments', data);
export const getLicenseAssignments = () => api.get('/license-assignments');
export const getLicenseAssignmentsFor = (licenseId) => api.get(`/license-assignments/${licenseId}`);
export const unassignLicense = (id) => api.delete(`/license-assignments/${id}`);

// ── Assignments ─────────────────────────────────────────
export const getAssignments = (params) => api.get('/assignments', { params });
export const createAssignment = (data) => api.post('/assignments', data);
export const deleteAssignment = (id) => api.delete(`/assignments/${id}`);
export const getAssignmentHistory = (computerId) => api.get(`/assignments/history/${computerId}`);

// ── Kiosks ──────────────────────────────────────────────
export const getKiosks = (params) => api.get('/kiosks', { params });
export const getKiosk = (id) => api.get(`/kiosks/${id}`);
export const createKiosk = (data) => api.post('/kiosks', data);
export const updateKiosk = (id, data) => api.put(`/kiosks/${id}`, data);
export const deleteKiosk = (id) => api.delete(`/kiosks/${id}`);
export const bulkCreateKiosks = (items) => api.post('/kiosks/bulk', items);

// ── Printers ────────────────────────────────────────────
export const getPrinters = (params) => api.get('/printers', { params });
export const getPrinter = (id) => api.get(`/printers/${id}`);
export const createPrinter = (data) => api.post('/printers', data);
export const updatePrinter = (id, data) => api.put(`/printers/${id}`, data);
export const deletePrinter = (id) => api.delete(`/printers/${id}`);
export const bulkCreatePrinters = (items) => api.post('/printers/bulk', items);

// ── Dynamic Categories ──────────────────────────────────
export const getCategories = () => api.get('/categories');
export const getCategoryBySlug = (slug) => api.get(`/categories/${slug}`);
export const createCategory = (data) => api.post('/categories', data);
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/categories/${id}`);

// ── Dynamic Category Items ──────────────────────────────
export const getCategoryItems = (slug, params) => api.get(`/categories/${slug}/items`, { params });
export const createCategoryItem = (slug, data) => api.post(`/categories/${slug}/items`, data);
export const bulkCreateCategoryItems = (slug, items) => api.post(`/categories/${slug}/items/bulk`, items);
export const updateCategoryItem = (id, data) => api.put(`/categories/items/${id}`, data);
export const deleteCategoryItem = (id) => api.delete(`/categories/items/${id}`);

// ── Processes ───────────────────────────────────────────
export const getProcesses = () => api.get('/processes');
export const getProcess = (id) => api.get(`/processes/${id}`);
export const createProcess = (data) => api.post('/processes', data);
export const updateProcess = (id, data) => api.put(`/processes/${id}`, data);
export const deleteProcess = (id) => api.delete(`/processes/${id}`);

// ── Process Steps ───────────────────────────────────────
export const getProcessSteps = (processId) => api.get(`/processes/${processId}/steps`);
export const createProcessStep = (processId, data) => api.post(`/processes/${processId}/steps`, data);
export const updateProcessStep = (stepId, data) => api.put(`/processes/steps/${stepId}`, data);
export const deleteProcessStep = (stepId) => api.delete(`/processes/steps/${stepId}`);
export const reorderProcessSteps = (processId, stepIds) => api.put(`/processes/${processId}/steps/reorder`, stepIds);

// ── Dashboard ───────────────────────────────────────────
export const getDashboardStats = () => api.get('/dashboard/stats');

export default api;
