import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('csoj_jwt');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && error.response.data?.data?.banned_until) {
      if (error.config.url === '/auth/local/login') {
        return Promise.reject(error);
      }
      
      window.dispatchEvent(new CustomEvent('auth-error-403-banned', { detail: error.response.data.data }));
    }
    return Promise.reject(error);
  }
);

export default api;