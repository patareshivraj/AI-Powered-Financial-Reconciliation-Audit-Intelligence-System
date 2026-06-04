import axios from 'axios';

// Create a globally configured Axios instance
export const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Axios Interceptor to dynamically inject the JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('bank_ai_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('bank_ai_token');
        // We could redirect to a login page here in full production
        // window.location.href = '/login'; 
      }
    }
    return Promise.reject(error);
  }
);
