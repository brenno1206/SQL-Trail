'use client';
import { useState } from 'react';
import Link from 'next/link';
import { StudentService } from '@/lib/services/student';
import LoadingSpinner from '@/components/LoadingSpinner';
import { IoMdStats } from '@/assets/icons';
import { getScenarioIcon } from '@/types/databases';
import { Scenario } from '@/types/models';
import { ProgressData } from '@/types/metrics';
import { getErrorMessage } from '@/lib/api';

/** Cartão de banco de dados (cenário) para seleção do estudante, com acesso ao progresso */
export default function DatabaseCard({ scenario }: { scenario: Scenario }) {
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState<ProgressData | null>(null);

  const IconComponent = getScenarioIcon(scenario.slug);

  const openMetrics = async () => {
    setShowModal(true);
    setIsLoading(true);
    setError('');
    try {
      setMetrics(await StudentService.getMetrics(scenario.id));
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao buscar seu progresso.'));
    } finally {
      setIsLoading(false);
    }
  };

  const totalSeconds = metrics?.total_time_seconds ?? 0;

  return (
    <>
      <div className="group relative">
        <Link
          href={`/${scenario.slug}`}
          className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-300 rounded-lg shadow-md border border-gray-200 transition-all hover:shadow-xl hover:bg-blue-50 hover:-translate-y-1"
        >
          <IconComponent className="text-4xl text-blue-700 mb-4 transition-colors group-hover:text-blue-800" />
          <h3 className="text-xl font-semibold text-gray-700 group-hover:text-blue-800">
            {scenario.name}
          </h3>
        </Link>
        <button
          onClick={openMetrics}
          className="absolute top-4 right-4 text-blue-500 hover:text-blue-700 font-bold z-10 p-2 hover:bg-blue-100 rounded-full cursor-pointer"
          title="Ver meu progresso"
          aria-label={`Ver meu progresso em ${scenario.name}`}
        >
          <IoMdStats className="w-6 h-6" />
        </button>
      </div>

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
              Progresso - {scenario.name}
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
            ) : error ? (
              <p className="text-red-600 mb-6">{error}</p>
            ) : (
              metrics && (
                <>
                  <div className="text-lg text-gray-600 mb-2">
                    Nível na trilha:{' '}
                    <span className="font-bold text-blue-600">
                      {metrics.mastered_until} / {metrics.trail_size}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${metrics.completion_percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-lg text-gray-600 mb-2">
                    Questões resolvidas:{' '}
                    <span className="font-bold text-blue-600">
                      {metrics.total_solved_questions} /{' '}
                      {metrics.total_available_questions}
                    </span>
                  </div>
                  <div className="text-lg text-gray-600 mb-6">
                    Tempo Total:{' '}
                    <span className="font-bold text-blue-600">
                      {Math.floor(totalSeconds / 60)}m {totalSeconds % 60}s
                    </span>
                  </div>
                </>
              )
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
