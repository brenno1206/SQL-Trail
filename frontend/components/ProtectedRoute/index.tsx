'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

type Role = 'student' | 'teacher' | 'admin';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

/** Componente de rota protegida */
export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
        Carregando...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role as Role)) {
      return (
        <div className="flex flex-col min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
          <h1 className="text-6xl font-bold text-red-500 mb-4">403</h1>
          <h2 className="text-2xl font-semibold mb-2">Acesso Negado</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Você não tem permissão para visualizar este conteúdo.
          </p>
          <button
            onClick={() => router.back()}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition cursor-pointer"
          >
            Voltar
          </button>
        </div>
      );
    }
  }

  return <>{children}</>;
}
