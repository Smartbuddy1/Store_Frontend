// Central API service for connecting to the backend
const getBaseUrl = () => {
  if (import.meta.env.PROD) {
    // In production, always use the defined API URL to prevent Mixed Content errors over HTTPS
    return import.meta.env.VITE_API_URL || '/api';
  }
  // During local dev, dynamically use the host so network devices can connect
  const host = window.location.hostname;
  return `http://${host}:5001/api`;
};

const BASE_URL = getBaseUrl();

// Get auth headers with JWT token
const getAuthHeaders = (extra = {}) => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extra
  };
};

const handleResponse = async (res) => {
  if (res.status === 401) {
    // Token expired or invalid → force logout
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired. Please login again.');
  }
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
    getAll: () => fetch(`${BASE_URL}/categories`, { headers: getAuthHeaders({ 'Cache-Control': 'no-cache' }) }).then(handleResponse),
    create: (body) => fetch(`${BASE_URL}/categories`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    update: (id, body) => fetch(`${BASE_URL}/categories/${id}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    delete: (id) => fetch(`${BASE_URL}/categories/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(handleResponse),
  },

  // ========================
  // STAFF
  // ========================
  staff: {
    getAll: () => fetch(`${BASE_URL}/staff`, { headers: getAuthHeaders({ 'Cache-Control': 'no-cache' }) }).then(handleResponse),
    create: (body) => fetch(`${BASE_URL}/staff`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    update: (id, body) => fetch(`${BASE_URL}/staff/${id}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    delete: (id) => fetch(`${BASE_URL}/staff/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(handleResponse),
  },

  // ========================
  // ITEMS (Item Master)
  // ========================
  items: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/items${query ? `?${query}` : ''}`, { headers: getAuthHeaders() }).then(handleResponse);
    },
    getAllPaginated: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/items/paginated${query ? `?${query}` : ''}`, { headers: getAuthHeaders() }).then(handleResponse);
    },
    getByCode: (code) => fetch(`${BASE_URL}/items/${code}`, { headers: getAuthHeaders() }).then(handleResponse),
    create: (body) => fetch(`${BASE_URL}/items`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    update: (id, body) => fetch(`${BASE_URL}/items/${id}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    delete: (id) => fetch(`${BASE_URL}/items/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(handleResponse),
  },

  // ========================
  // STOCK IN
  // ========================
  stockIn: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/stock-in${query ? `?${query}` : ''}`, { headers: getAuthHeaders() }).then(handleResponse);
    },
    getAllPaginated: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/stock-in/paginated${query ? `?${query}` : ''}`, { headers: getAuthHeaders() }).then(handleResponse);
    },
    create: (body) => fetch(`${BASE_URL}/stock-in`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    update: (id, body) => fetch(`${BASE_URL}/stock-in/${id}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    delete: (id) => fetch(`${BASE_URL}/stock-in/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(handleResponse),
  },

  // ========================
  // STOCK OUT
  // ========================
  stockOut: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/stock-out${query ? `?${query}` : ''}`, { headers: getAuthHeaders() }).then(handleResponse);
    },
    getAllPaginated: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/stock-out/paginated${query ? `?${query}` : ''}`, { headers: getAuthHeaders() }).then(handleResponse);
    },
    create: (body) => fetch(`${BASE_URL}/stock-out`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    update: (id, body) => fetch(`${BASE_URL}/stock-out/${id}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    delete: (id) => fetch(`${BASE_URL}/stock-out/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(handleResponse),
  },

  // ========================
  // CURRENT STOCK
  // ========================
  currentStock: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/current-stock${query ? `?${query}` : ''}`, { headers: getAuthHeaders() }).then(handleResponse);
    },
    getDashboardStats: () => fetch(`${BASE_URL}/current-stock/dashboard`, { headers: getAuthHeaders({ 'Cache-Control': 'no-cache' }) }).then(handleResponse),
  },

  // ========================
  // TOOLS
  // ========================
  tools: {
    getAllTools: () => fetch(`${BASE_URL}/tools`, { headers: getAuthHeaders({ 'Cache-Control': 'no-cache' }) }).then(handleResponse),
    createTool: (body) => fetch(`${BASE_URL}/tools`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    deleteTool: (id) => fetch(`${BASE_URL}/tools/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(handleResponse),

    getAllLogs: () => fetch(`${BASE_URL}/tools/logs`, { headers: getAuthHeaders({ 'Cache-Control': 'no-cache' }) }).then(handleResponse),
    issueTool: (body) => fetch(`${BASE_URL}/tools/issue`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    returnTool: (id, body) => fetch(`${BASE_URL}/tools/return/${id}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    updateLog: (id, body) => fetch(`${BASE_URL}/tools/logs/${id}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    deleteLog: (id) => fetch(`${BASE_URL}/tools/logs/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(handleResponse),
  },

  // ========================
  // KITS / PACKAGES
  // ========================
  kits: {
    getAll: () => fetch(`${BASE_URL}/kits`, { headers: getAuthHeaders({ 'Cache-Control': 'no-cache' }) }).then(handleResponse),
    getById: (id) => fetch(`${BASE_URL}/kits/${id}`, { headers: getAuthHeaders() }).then(handleResponse),
    create: (body) => fetch(`${BASE_URL}/kits`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    update: (id, body) => fetch(`${BASE_URL}/kits/${id}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    delete: (id) => fetch(`${BASE_URL}/kits/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(handleResponse),
  }
};

export default api;
