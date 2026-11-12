import axios, { AxiosError } from 'axios';

/** Evento disparado quando a API responde 401 (token ausente, inválido ou expirado). */
export const UNAUTHORIZED_EVENT = 'sqltrail:unauthorized';

/** Instância configurada do axios para comunicação com a API */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000',
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
  (error) => Promise.reject(error),
);

/** Sessão expirada ou token inválido: avisa o AuthContext para fazer logout. */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isLoginRequest = error.config?.url?.startsWith('/auth/login');
    if (
      error.response?.status === 401 &&
      !isLoginRequest &&
      typeof window !== 'undefined'
    ) {
      const data = error.response.data as { error?: string } | undefined;
      window.dispatchEvent(
        new CustomEvent(UNAUTHORIZED_EVENT, { detail: data?.error }),
      );
    }
    return Promise.reject(error);
  },
);

/**
 * Extrai a mensagem de erro mais útil de uma falha de requisição:
 * a mensagem enviada pelo backend ou, na falta dela, um texto amigável.
 */
export function getErrorMessage(error: unknown, fallback = 'Erro inesperado.') {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { error?: string; message?: string; msg?: string }
      | undefined;
    const backendMessage = data?.error || data?.message || data?.msg;
    if (backendMessage) return backendMessage;
    if (!error.response) {
      return 'Não foi possível conectar ao servidor. Verifique se o backend está em execução.';
    }
    return `${fallback} (HTTP ${error.response.status})`;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
