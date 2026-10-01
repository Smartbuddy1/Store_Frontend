// Central API service for connecting to the backend
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Something went wrong');
  }
  return data.data;
};

const api = {
  // ========================
  // CATEGORIES
  // ========================
  categories: {
    getAll: () => fetch(`${BASE_URL}/categories`, { headers: { 'Cache-Control': 'no-cache' } }).then(handleResponse),
    create: (body) => fetch(`${BASE_URL}/categories`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(handleResponse),
    update: (id, body) => fetch(`${BASE_URL}/categories/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(handleResponse),
    delete: (id) => fetch(`${BASE_URL}/categories/${id}`, { method: 'DELETE' }).then(handleResponse),
  },

  // ========================
  // STAFF
  // ========================
  staff: {
    getAll: () => fetch(`${BASE_URL}/staff`, { headers: { 'Cache-Control': 'no-cache' } }).then(handleResponse),
    create: (body) => fetch(`${BASE_URL}/staff`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(handleResponse),
    update: (id, body) => fetch(`${BASE_URL}/staff/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(handleResponse),
    delete: (id) => fetch(`${BASE_URL}/staff/${id}`, { method: 'DELETE' }).then(handleResponse),
  },

  // ========================
  // ITEMS (Item Master)
  // ========================
  items: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/items${query ? `?${query}` : ''}`).then(handleResponse);
    },
    getByCode: (code) => fetch(`${BASE_URL}/items/${code}`).then(handleResponse),
    create: (body) => fetch(`${BASE_URL}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(handleResponse),
    update: (id, body) => fetch(`${BASE_URL}/items/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(handleResponse),
    delete: (id) => fetch(`${BASE_URL}/items/${id}`, { method: 'DELETE' }).then(handleResponse),
  },

  // ========================
  // STOCK IN
  // ========================
  stockIn: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/stock-in${query ? `?${query}` : ''}`).then(handleResponse);
    },
    create: (body) => fetch(`${BASE_URL}/stock-in`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(handleResponse),
    update: (id, body) => fetch(`${BASE_URL}/stock-in/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(handleResponse),
    delete: (id) => fetch(`${BASE_URL}/stock-in/${id}`, { method: 'DELETE' }).then(handleResponse),
  },

  // ========================
  // STOCK OUT
  // ========================
  stockOut: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/stock-out${query ? `?${query}` : ''}`).then(handleResponse);
    },
    create: (body) => fetch(`${BASE_URL}/stock-out`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(handleResponse),
    update: (id, body) => fetch(`${BASE_URL}/stock-out/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(handleResponse),
    delete: (id) => fetch(`${BASE_URL}/stock-out/${id}`, { method: 'DELETE' }).then(handleResponse),
  },

  // ========================
  // CURRENT STOCK
  // ========================
  currentStock: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/current-stock${query ? `?${query}` : ''}`).then(handleResponse);
    },
    getDashboardStats: () => fetch(`${BASE_URL}/current-stock/dashboard`, { headers: { 'Cache-Control': 'no-cache' } }).then(handleResponse),
  },

  // ========================
  // TOOLS
  // ========================
  tools: {
    getAllTools: () => fetch(`${BASE_URL}/tools`, { headers: { 'Cache-Control': 'no-cache' } }).then(handleResponse),
    createTool: (body) => fetch(`${BASE_URL}/tools`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(handleResponse),
    deleteTool: (id) => fetch(`${BASE_URL}/tools/${id}`, { method: 'DELETE' }).then(handleResponse),

    getAllLogs: () => fetch(`${BASE_URL}/tools/logs`, { headers: { 'Cache-Control': 'no-cache' } }).then(handleResponse),
    issueTool: (body) => fetch(`${BASE_URL}/tools/issue`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(handleResponse),
    returnTool: (id, body) => fetch(`${BASE_URL}/tools/return/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(handleResponse),
    updateLog: (id, body) => fetch(`${BASE_URL}/tools/logs/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(handleResponse),
    deleteLog: (id) => fetch(`${BASE_URL}/tools/logs/${id}`, { method: 'DELETE' }).then(handleResponse),
  },

  // ========================
  // KITS / PACKAGES
  // ========================
  kits: {
    getAll: () => fetch(`${BASE_URL}/kits`, { headers: { 'Cache-Control': 'no-cache' } }).then(handleResponse),
    getById: (id) => fetch(`${BASE_URL}/kits/${id}`).then(handleResponse),
    create: (body) => fetch(`${BASE_URL}/kits`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(handleResponse),
    update: (id, body) => fetch(`${BASE_URL}/kits/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(handleResponse),
    delete: (id) => fetch(`${BASE_URL}/kits/${id}`, { method: 'DELETE' }).then(handleResponse),
  }
};

export default api;
