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
import { api } from '@/lib/api';

type User = {
  name: string;
  role: string;
};

type AuthContextType = {
  user: User | null;
  login: (login_id: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  firstAccess: (
    registration_number: string,
    new_password: string,
  ) => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
};
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
    setUser(null);
    router.push('/login');
  }, [router]);

  useEffect(() => {
    const TIME_LIMIT = 30 * 60 * 1000;

    setTimeout(() => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      const lastActivity = localStorage.getItem('lastActivity');
      const now = new Date().getTime();

      if (lastActivity && now - parseInt(lastActivity) > TIME_LIMIT) {
        logout();
        setIsLoading(false);
        return;
      }

      if (token && storedUser) {
        setUser(JSON.parse(storedUser));
      }

      setIsLoading(false);
    }, 0);

    const atualizaAtividade = () => {
      localStorage.setItem('lastActivity', new Date().getTime().toString());
    };

    const verificaInatividade = setInterval(() => {
      const ultimaAcao = localStorage.getItem('lastActivity');
      if (
        ultimaAcao &&
        new Date().getTime() - parseInt(ultimaAcao) > TIME_LIMIT
      ) {
        logout();
      }
    }, 120000);

    window.addEventListener('mousemove', atualizaAtividade);
    window.addEventListener('keydown', atualizaAtividade);
    window.addEventListener('click', atualizaAtividade);

    return () => {
      window.removeEventListener('mousemove', atualizaAtividade);
      window.removeEventListener('keydown', atualizaAtividade);
      window.removeEventListener('click', atualizaAtividade);
      clearInterval(verificaInatividade);
    };
  }, [logout]);

  const firstAccess = async (
    registration_number: string,
    new_password: string,
  ) => {
    try {
      await api.post('/auth/student/first-access', {
        registration_number,
        new_password,
      });
    } catch (error) {
      console.error('Erro no primeiro acesso', error);
      throw error;
    }
  };

  const login = async (login_id: string, password: string, role: string) => {
    try {
      const response = await api.post('/auth/login', {
        login_id,
        password,
        role,
      });
      const { access_token, name } = response.data;

      localStorage.setItem('token', access_token);
      localStorage.setItem('lastActivity', new Date().getTime().toString());

      const userData = { name, role };
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      router.push('/');
    } catch (error) {
      console.error('Erro no login', error);
      throw error;
    }
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
