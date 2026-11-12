'use client';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { api, UNAUTHORIZED_EVENT } from '@/lib/api';
import { Role } from '@/types/models';

/** Contexto de Gerenciamento de Autenticação */
type User = {
  id?: number;
  name: string;
  role: Role;
};

type AuthContextType = {
  user: User | null;
  login: (login_id: string, password: string, role: Role) => Promise<void>;
  logout: (reason?: string) => void;
  firstAccess: (
    registration_number: string,
    access_code: string,
    new_password: string,
  ) => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

/** Tempo máximo de inatividade antes do logout automático */
const INACTIVITY_LIMIT = 30 * 60 * 1000;
/** Intervalo mínimo entre gravações do horário da última atividade */
const ACTIVITY_WRITE_INTERVAL = 30 * 1000;
/** Chave usada para exibir o motivo do logout na tela de login */
export const LOGOUT_REASON_KEY = 'logoutReason';

function safeGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* armazenamento indisponível */
  }
}

function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* armazenamento indisponível */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const logout = useCallback(
    (reason?: string) => {
      safeRemove('token');
      safeRemove('user');
      safeRemove('lastActivity');
      if (reason) {
        try {
          sessionStorage.setItem(LOGOUT_REASON_KEY, reason);
        } catch {
          /* ignore */
        }
      }
      setUser(null);
      router.push('/login');
    },
    [router],
  );

  useEffect(() => {
    // Restaura a sessão salva (apenas no cliente, fora do ciclo síncrono do efeito).
    const restoreTimer = setTimeout(() => {
      const token = safeGet('token');
      const storedUser = safeGet('user');
      const lastActivity = safeGet('lastActivity');

      if (
        lastActivity &&
        Date.now() - parseInt(lastActivity) > INACTIVITY_LIMIT
      ) {
        logout('Sessão encerrada por inatividade.');
      } else if (token && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    }, 0);

    let lastWrite = 0;
    const registerActivity = () => {
      const current = Date.now();
      if (current - lastWrite > ACTIVITY_WRITE_INTERVAL) {
        lastWrite = current;
        safeSet('lastActivity', current.toString());
      }
    };

    const inactivityCheck = setInterval(() => {
      const last = safeGet('lastActivity');
      if (
        safeGet('token') &&
        last &&
        Date.now() - parseInt(last) > INACTIVITY_LIMIT
      ) {
        logout('Sessão encerrada por inatividade.');
      }
    }, 60000);

    const onUnauthorized = (event: Event) => {
      if (!safeGet('token')) return;
      const detail = (event as CustomEvent<string | undefined>).detail;
      logout(detail || 'Sua sessão expirou. Faça login novamente.');
    };

    window.addEventListener('mousemove', registerActivity);
    window.addEventListener('keydown', registerActivity);
    window.addEventListener('click', registerActivity);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);

    return () => {
      window.removeEventListener('mousemove', registerActivity);
      window.removeEventListener('keydown', registerActivity);
      window.removeEventListener('click', registerActivity);
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
      clearInterval(inactivityCheck);
      clearTimeout(restoreTimer);
    };
  }, [logout]);

  const firstAccess = async (
    registration_number: string,
    access_code: string,
    new_password: string,
  ) => {
    await api.post('/auth/student/first-access', {
      registration_number,
      access_code,
      new_password,
    });
  };

  const login = async (login_id: string, password: string, role: Role) => {
    const response = await api.post('/auth/login', {
      login_id,
      password,
      role,
    });
    const { access_token, name, id } = response.data;
    safeSet('token', access_token);
    safeSet('lastActivity', Date.now().toString());
    const userData: User = { id, name, role };
    safeSet('user', JSON.stringify(userData));
    setUser(userData);
    router.push('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        firstAccess,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
