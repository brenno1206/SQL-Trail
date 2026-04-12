'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';

/**
 * Página de login para alunos, professores e administradores, permitindo acesso seguro ao sistema.
 */
export default function LoginPage() {
  const { login, firstAccess, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('A senha é obrigatória.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (role === 'student' && isFirstAccess) {
        await firstAccess(loginId, password);
        await login(loginId, password, role);
      } else {
        await login(loginId, password, role);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const mensagemBackend =
        err.response?.data?.error || err.response?.data?.message;
      setError(mensagemBackend || 'Erro na conexão ou credenciais inválidas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    setIsFirstAccess(false);
    setError('');
  };

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const roles = [
    { id: 'student', label: 'Aluno' },
    { id: 'teacher', label: 'Professor' },
    { id: 'admin', label: 'Admin' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="grow flex items-center justify-center container mx-auto px-4 py-12">
        <section className="w-full max-w-md p-8 md:p-10 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
          <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-50 mb-8">
            {isFirstAccess ? 'Crie sua senha' : 'Acesse sua conta'}
          </h2>

          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded mb-6 text-sm text-center border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 mb-8">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleRoleChange(r.id)}
                  className={`pb-3 px-2 text-sm md:text-base font-semibold transition-all duration-300 outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50
                    ${
                      role === r.id
                        ? 'text-blue-700 dark:text-blue-500 border-b-2 border-blue-700 dark:border-blue-500'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 border-b-2 border-transparent'
                    }
                  `}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="space-y-5">
              <div>
                <input
                  type="text"
                  placeholder={role === 'admin' ? 'Email' : 'Matrícula'}
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  required
                />
              </div>

              <div>
                <input
                  type="password"
                  placeholder={isFirstAccess ? 'Crie uma nova senha' : 'Senha'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  required
                />
              </div>

              {role === 'student' && (
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    id="first-access"
                    checked={isFirstAccess}
                    onChange={(e) => setIsFirstAccess(e.target.checked)}
                    disabled={isSubmitting}
                    className="mr-2 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  />
                  <label
                    htmlFor="first-access"
                    className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Este é meu primeiro acesso
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white font-semibold text-lg p-3 rounded-lg hover:bg-blue-700 hover:shadow-md transition-all duration-300 mt-4 cursor-pointer flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting && <LoadingSpinner />}
                {isSubmitting
                  ? 'Entrando...'
                  : isFirstAccess
                    ? 'Cadastrar e Entrar'
                    : 'Entrar'}
              </button>
            </div>
          </form>
        </section>
      </main>

      <Footer />
    </div>
  );
}
