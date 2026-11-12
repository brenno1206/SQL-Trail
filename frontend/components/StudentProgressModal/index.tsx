'use client';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Student } from '@/types/models';
import { ProgressData } from '@/types/metrics';

interface StudentProgressModalProps {
  student: Student;
  loading: boolean;
  globalProgress: ProgressData | null;
  scenarioProgress: ProgressData[];
  onClose: () => void;
}

/** Formata segundos como "1h 05m 30s" / "5m 30s" / "30s" */
export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

/**
 * Modal de desempenho de um aluno: progresso na trilha adaptativa (nível dominado),
 * questões efetivamente resolvidas e tempo total, no geral e por cenário.
 */
export default function StudentProgressModal({
  student,
  loading,
  globalProgress,
  scenarioProgress,
  onClose,
}: StudentProgressModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Desempenho do Aluno
            </h2>
            <p className="text-gray-500 text-sm">
              {student.name} ({student.registration_number})
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-gray-500 hover:text-black text-2xl cursor-pointer"
          >
            &times;
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-blue-900">
                  Progresso Geral
                </h3>
                <p className="text-sm text-blue-700">
                  Progresso na trilha:{' '}
                  <strong>
                    {globalProgress?.mastered_until ?? 0} /{' '}
                    {globalProgress?.trail_size ?? 0}
                  </strong>{' '}
                  ({globalProgress?.completion_percentage ?? 0}%)
                </p>
                <p className="text-sm text-blue-700">
                  Questões resolvidas:{' '}
                  <strong>
                    {globalProgress?.total_solved_questions ?? 0} /{' '}
                    {globalProgress?.total_available_questions ?? 0}
                  </strong>
                </p>
                <p className="text-sm text-blue-700">
                  Tempo total:{' '}
                  <strong>
                    {formatDuration(globalProgress?.total_time_seconds ?? 0)}
                  </strong>
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-blue-600">
                  {globalProgress?.completion_percentage ?? 0}%
                </div>
                <div className="text-sm font-semibold text-blue-500">
                  da trilha dominada
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3">
                Progresso por Banco de Dados (Cenário)
              </h3>
              {scenarioProgress.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  Nenhum banco de dados disponível.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scenarioProgress.map((sp) => (
                    <div
                      key={sp.scenario_name}
                      className="border p-4 rounded-lg shadow-sm"
                    >
                      <div
                        className="font-semibold text-gray-800 mb-2 truncate"
                        title={sp.scenario_name}
                      >
                        {sp.scenario_name}
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-sm text-gray-600">
                          Trilha:{' '}
                          <span className="text-2xl font-bold text-gray-700">
                            {sp.mastered_until}
                          </span>{' '}
                          <span className="text-sm text-gray-400">
                            / {sp.trail_size}
                          </span>
                        </span>
                        <span
                          className={`text-sm font-bold ${sp.completion_percentage === 100 ? 'text-green-500' : 'text-gray-500'}`}
                        >
                          {sp.completion_percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${Math.min(100, sp.completion_percentage)}%`,
                          }}
                        ></div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500 flex justify-between">
                        <span>
                          Resolvidas: {sp.total_solved_questions} /{' '}
                          {sp.total_available_questions}
                        </span>
                        <span>
                          Tempo: {formatDuration(sp.total_time_seconds)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
