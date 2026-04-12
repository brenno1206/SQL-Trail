import axios from 'axios';

/** Instância configurada do axios para comunicação com a API */
export const api = axios.create({
  baseURL: 'http://127.0.0.1:5000',
});

/** Interceptor para adicionar o token de autenticação em todas as requisições */
api.interceptors.request.use(
  (config) => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
