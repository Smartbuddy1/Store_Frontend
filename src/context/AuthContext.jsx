import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const getBaseUrl = () => {
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_URL || '/api';
  }
  const host = window.location.hostname;
  return `http://${host}:5001/api`;
};

const BASE_URL = getBaseUrl();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in (token in localStorage)
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      // Set token in axios defaults
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(JSON.parse(storedUser));

      // Verify token is still valid with backend
      axios.get(`${BASE_URL}/auth/verify`)
        .then(res => {
          if (res.data.success) {
            setUser(res.data.user);
          } else {
            logout();
          }
        })
        .catch(() => {
          // Token expired or invalid → logout
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (mobile, password) => {
    try {
      const res = await axios.post(`${BASE_URL}/auth/login`, { mobile, password });

      if (res.data.success) {
        const { token, user: userData } = res.data;

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));

        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
        return { success: true, role: userData.role };
      } else {
        return { success: false, message: res.data.message };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
