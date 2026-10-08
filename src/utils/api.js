// Central API service for connecting to the backend
const getBaseUrl = () => {
  if (import.meta.env.PROD) {
    // In production, always use the defined API URL to prevent Mixed Content errors over HTTPS
    return import.meta.env.VITE_API_URL || '/api';
  }
  // During local dev, dynamically use the host so network devices can connect
  const host = window.location.hostname;
  const apiHost = host === 'localhost' ? '127.0.0.1' : host;
  return `http://${apiHost}:5001/api`;
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

const cache = new Map();

const fetchWithCache = async (url, options = {}, cacheDuration = 5 * 60 * 1000) => {
  const isCacheable = !options.method || options.method === 'GET';
  
  if (!isCacheable) {
    // If it's a mutation (POST, PUT, DELETE), clear the entire cache
    // so subsequent GET requests fetch fresh data.
    cache.clear();
  }

  if (isCacheable) {
    const cached = cache.get(url);
    if (cached && (Date.now() - cached.timestamp < cacheDuration)) {
      // Trigger background refetch to keep data fresh
      fetch(url, options)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            cache.set(url, { data: data.data, timestamp: Date.now() });
          }
        }).catch(() => {});
      return cached.data; // Return cached instantly
    }
  }

  const res = await fetch(url, options);
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired. Please login again.');
  }
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Something went wrong');
  }

  if (isCacheable) {
    cache.set(url, { data: data.data, timestamp: Date.now() });
  }

  return data.data;
};

const handleResponse = async (res) => {
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired. Please login again.');
  }
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Something went wrong');
  }
  return data.data || data;
};

const apiFetch = async (url, options = {}) => {
  if (options.method && ['POST', 'PUT', 'DELETE'].includes(options.method.toUpperCase())) {
    cache.clear();
  }
  return fetch(url, options);
};

const api = {
  // ========================
  // CATEGORIES
  // ========================
  categories: {
    getAll: () => fetchWithCache(`${BASE_URL}/categories`, { headers: getAuthHeaders({ 'Cache-Control': 'no-cache' }) }),
    create: (body) => apiFetch(`${BASE_URL}/categories`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(res => res.json()).then(d => { if(!d.success) throw new Error(d.message); return d.data; }),
    update: (id, body) => apiFetch(`${BASE_URL}/categories/${id}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    delete: (id) => apiFetch(`${BASE_URL}/categories/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(handleResponse),
  },

  // ========================
  // STAFF
  // ========================
  staff: {
    getAll: () => fetchWithCache(`${BASE_URL}/staff`, { headers: getAuthHeaders({ 'Cache-Control': 'no-cache' }) }),
    create: (body) => apiFetch(`${BASE_URL}/staff`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(res => res.json()).then(d => { if(!d.success) throw new Error(d.message); return d.data; }),
    update: (id, body) => apiFetch(`${BASE_URL}/staff/${id}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    delete: (id) => apiFetch(`${BASE_URL}/staff/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(handleResponse),
  },

  // ========================
  // ITEMS (Item Master)
  // ========================
  items: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetchWithCache(`${BASE_URL}/items${query ? `?${query}` : ''}`, { headers: getAuthHeaders() });
    },
    getAllPaginated: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetchWithCache(`${BASE_URL}/items/paginated${query ? `?${query}` : ''}`, { headers: getAuthHeaders() });
    },
    getByCode: (code) => fetchWithCache(`${BASE_URL}/items/${code}`, { headers: getAuthHeaders() }),
    create: (body) => apiFetch(`${BASE_URL}/items`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(res => res.json()).then(d => { if(!d.success) throw new Error(d.message); return d.data; }),
    update: (id, body) => apiFetch(`${BASE_URL}/items/${id}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    delete: (id) => apiFetch(`${BASE_URL}/items/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(handleResponse),
  },

  // ========================
  // STOCK IN
  // ========================
  stockIn: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetchWithCache(`${BASE_URL}/stock-in${query ? `?${query}` : ''}`, { headers: getAuthHeaders() }, 30000); // 30 sec cache
    },
    getAllPaginated: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetchWithCache(`${BASE_URL}/stock-in/paginated${query ? `?${query}` : ''}`, { headers: getAuthHeaders() }, 30000);
    },
    create: (body) => apiFetch(`${BASE_URL}/stock-in`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(res => res.json()).then(d => { if(!d.success) throw new Error(d.message); return d.data; }),
    update: (id, body) => apiFetch(`${BASE_URL}/stock-in/${id}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    delete: (id) => apiFetch(`${BASE_URL}/stock-in/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(handleResponse),
  },

  // ========================
  // STOCK OUT
  // ========================
  stockOut: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetchWithCache(`${BASE_URL}/stock-out${query ? `?${query}` : ''}`, { headers: getAuthHeaders() }, 30000);
    },
    getAllPaginated: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetchWithCache(`${BASE_URL}/stock-out/paginated${query ? `?${query}` : ''}`, { headers: getAuthHeaders() }, 30000);
    },
    create: (body) => apiFetch(`${BASE_URL}/stock-out`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(res => res.json()).then(d => { if(!d.success) throw new Error(d.message); return d.data; }),
    update: (id, body) => apiFetch(`${BASE_URL}/stock-out/${id}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    delete: (id) => apiFetch(`${BASE_URL}/stock-out/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(handleResponse),
  },

  // ========================
  // CURRENT STOCK
  // ========================
  currentStock: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetchWithCache(`${BASE_URL}/current-stock${query ? `?${query}` : ''}`, { headers: getAuthHeaders() }, 30000);
    },
    getDashboardStats: () => fetchWithCache(`${BASE_URL}/current-stock/dashboard`, { headers: getAuthHeaders({ 'Cache-Control': 'no-cache' }) }, 30000),
  },

  // ========================
  // TOOLS
  // ========================
  tools: {
    getAllTools: () => apiFetch(`${BASE_URL}/tools`, { headers: getAuthHeaders({ 'Cache-Control': 'no-cache' }) }).then(handleResponse),
    createTool: (body) => apiFetch(`${BASE_URL}/tools`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    deleteTool: (id) => apiFetch(`${BASE_URL}/tools/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(handleResponse),
    updateTool: (id, body) => apiFetch(`${BASE_URL}/tools/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body) }).then(handleResponse),

    getAllLogs: () => apiFetch(`${BASE_URL}/tools/logs`, { headers: getAuthHeaders({ 'Cache-Control': 'no-cache' }) }).then(handleResponse),
    issueTool: (body) => apiFetch(`${BASE_URL}/tools/issue`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    returnTool: (id, body) => apiFetch(`${BASE_URL}/tools/return/${id}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    updateLog: (id, body) => apiFetch(`${BASE_URL}/tools/logs/${id}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    deleteLog: (id) => apiFetch(`${BASE_URL}/tools/logs/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(handleResponse),
  },

  // ========================
  // KITS / PACKAGES
  // ========================
  kits: {
    getAll: () => apiFetch(`${BASE_URL}/kits`, { headers: getAuthHeaders({ 'Cache-Control': 'no-cache' }) }).then(handleResponse),
    getById: (id) => apiFetch(`${BASE_URL}/kits/${id}`, { headers: getAuthHeaders() }).then(handleResponse),
    create: (body) => apiFetch(`${BASE_URL}/kits`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    update: (id, body) => apiFetch(`${BASE_URL}/kits/${id}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    delete: (id) => apiFetch(`${BASE_URL}/kits/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(handleResponse),
  },

  // ========================
  // REQUISITIONS HISTORY
  // ========================
  requisitions: {
    getAll: (type) => {
      const url = type ? `${BASE_URL}/requisitions?type=${type}` : `${BASE_URL}/requisitions`;
      return apiFetch(url, { headers: getAuthHeaders({ 'Cache-Control': 'no-cache' }) }).then(handleResponse);
    },
    create: (body) => apiFetch(`${BASE_URL}/requisitions`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body)
    }).then(handleResponse),
    delete: (id) => apiFetch(`${BASE_URL}/requisitions/${id}`, {
      method: 'DELETE', headers: getAuthHeaders()
    }).then(handleResponse)
  }
};

export default api;
