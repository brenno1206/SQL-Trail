'use client';
import { useEffect, useState } from 'react';
import DatabaseCard from '@/components/DatabaseCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { StudentService } from '@/lib/services/student';
import { getErrorMessage } from '@/lib/api';
import { Scenario } from '@/types/models';

/**
 * Componente de dashboard dos estudantes: lista os bancos de dados (cenários) disponíveis
 */
export default function StudentDashboard({ userName }: { userName: string }) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    StudentService.getAllScenarios()
      // Só aparecem cenários com questões e banco configurado no servidor.
      .then((data) =>
        setScenarios(
          data.filter(
            (s) => (s.question_count ?? 0) > 0 && s.has_credentials !== false,
          ),
        ),
      )
      .catch((err) =>
        setError(getErrorMessage(err, 'Erro ao carregar os bancos de dados.')),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-50 mb-2">
          Painel do Aluno
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Bem-vindo(a), {userName}. Aqui você pode acessar os bancos de dados
          para praticar suas habilidades em SQL.
        </p>
      </div>
      <h2 className="text-4xl font-bold text-center text-gray-800 dark:text-gray-50 mb-12">
        Selecione o Banco de Dados
      </h2>
      <section className="max-w-4xl mx-auto p-6 md:p-10 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        {loading ? (
          <div className="flex justify-center items-center gap-2 text-gray-500">
            <LoadingSpinner /> Carregando...
          </div>
        ) : error ? (
          <p className="text-center text-red-600">{error}</p>
        ) : scenarios.length === 0 ? (
          <p className="text-center text-gray-500">
            Nenhum banco de dados disponível no momento.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
            {scenarios.map((scenario) => (
              <DatabaseCard key={scenario.id} scenario={scenario} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
