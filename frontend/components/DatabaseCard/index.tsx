'use client';
import { useState } from 'react';
import Link from 'next/link';
import { IoMdPeople } from '@/assets/icons';
import { databases } from '@/types/databases';
import { StudentService } from '@/lib/services/student';
import LoadingSpinner from '@/components/LoadingSpinner';
import { IoMdStats } from '@/assets/icons';

interface DatabaseCardProps {
  slug: string;
  title: string;
}

/** Componente de cartão de banco de dados para seleção do estudante */
export default function DatabaseCard({ slug, title }: DatabaseCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    total_solved_questions: 0,
    total_time_seconds: 0,
    completion_percentage: 0,
  });

  const IconComponent =
    databases.find((db) => db.slug === slug)?.icon || IoMdPeople;

  const openMetrics = async (e: React.MouseEvent) => {
    e.preventDefault();

    setShowModal(true);
    setIsLoading(true);

    try {
      const data = await StudentService.getMetrics(slug);
      setMetrics(data);
    } catch (err) {
      console.error('Erro ao buscar métricas do aluno', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Link
        href={`/${slug}`}
        className="group relative flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-300 rounded-lg shadow-md border border-gray-200 transition-all hover:shadow-xl hover:bg-blue-50 hover:-translate-y-1"
      >
        <button
          onClick={openMetrics}
          className="absolute top-4 right-4 text-blue-500 hover:text-blue-700 font-bold z-10 p-2 hover:bg-blue-100 rounded-full cursor-pointer"
          title="Ver meu progresso"
        >
          <IoMdStats className="w-6 h-6" />
        </button>
        <IconComponent className="text-4xl text-blue-700 mb-4 transition-colors group-hover:text-blue-800" />
        <h3 className="text-xl font-semibold text-gray-700 group-hover:text-blue-800">
          {title}
        </h3>
      </Link>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Progresso - {title}
            </h2>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="text-blue-600 w-8 h-8 flex justify-center mb-4">
                  <LoadingSpinner />
                </div>
                <p className="text-gray-500 animate-pulse">
                  Buscando seus dados...
                </p>
              </div>
            ) : (
              <>
                <div className="text-lg text-gray-600 mb-2">
                  Questões Resolvidas:{' '}
                  <span className="font-bold text-blue-600">
                    {metrics.total_solved_questions}
                  </span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${metrics.completion_percentage}%` }}
                  ></div>
                </div>

                <div className="text-lg text-gray-600 mb-6">
                  Tempo Total:{' '}
                  <span className="font-bold text-blue-600">
                    {Math.floor(metrics.total_time_seconds / 60)}m{' '}
                    {metrics.total_time_seconds % 60}s
                  </span>
                </div>
              </>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
