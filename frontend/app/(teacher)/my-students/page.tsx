/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import ProtectedRoute from '@/components/ProtectedRoute';
import { teacherService } from '@/lib/services/teacher';
import LoadingSpinner from '@/components/LoadingSpinner';
import Toast from '@/components/Toast'; //
import { Student, Class, Scenario } from '@/types/models';
import { ProgressData } from '@/types/metrics';
import { Notification } from '@/types/ui';

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);

  const [filterClass, setFilterClass] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'registration'>('name');

  const [metricsStudent, setMetricsStudent] = useState<Student | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [globalProgress, setGlobalProgress] = useState<ProgressData | null>(
    null,
  );
  const [scenarioProgress, setScenarioProgress] = useState<ProgressData[]>([]);

  const showNotification = (
    message: string,
    type: 'success' | 'error' | 'warning',
  ) => {
    setNotification({ message, type });
  };

  const fetchStudents = useCallback(
    async (selectedClass: string, availableClasses: Class[]) => {
      setLoading(true);
      try {
        if (selectedClass === 'all') {
          const allStudentsMap = new Map<number, Student>();
          for (const c of availableClasses) {
            const classStudents = await teacherService.getStudentsInClass(c.id);
            classStudents.forEach((s: Student) => allStudentsMap.set(s.id, s));
          }
          setStudents(Array.from(allStudentsMap.values()));
        } else {
          const filtered = await teacherService.getStudentsInClass(
            parseInt(selectedClass),
          );
          setStudents(filtered);
        }
      } catch (error: any) {
        showNotification(`Erro ao buscar alunos. ${error.message}`, 'error');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [classesData, scenariosData] = await Promise.all([
        teacherService.getMyClasses(),
        teacherService.getAllScenarios(),
      ]);
      setClasses(classesData);
      setScenarios(scenariosData);

      if (classesData.length > 0) {
        await fetchStudents('all', classesData);
      } else {
        setLoading(false);
      }
    } catch (error: any) {
      showNotification(
        `Erro ao carregar dados iniciais. ${error.message}`,
        'error',
      );
      setLoading(false);
    }
  }, [fetchStudents]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (classes.length > 0) {
      fetchStudents(filterClass, classes);
    }
  }, [filterClass, classes, fetchStudents]);

  const displayedStudents = [...students].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return a.registration_number.localeCompare(b.registration_number);
  });

  const openMetrics = async (student: Student) => {
    setMetricsStudent(student);
    setLoadingMetrics(true);
    try {
      const global = await teacherService.getStudentProgress(student.id);
      setGlobalProgress(global);

      const perScenario = await Promise.all(
        scenarios.map(async (scen) => {
          const prog = await teacherService.getStudentProgress(student.id, {
            scenario_id: scen.id,
          });
          return { ...prog, scenario_name: scen.name };
        }),
      );
      setScenarioProgress(perScenario);
    } catch (error: any) {
      showNotification(
        `Erro ao carregar desempenho do aluno. ${error.message}`,
        'error',
      );
      setMetricsStudent(null);
    } finally {
      setLoadingMetrics(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['teacher']}>
      <div className="min-h-screen flex flex-col bg-gray-50 relative">
        <Header />

        {notification && (
          <Toast
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}

        <main className="grow max-w-5xl w-full mx-auto p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Meus Alunos</h1>
              <p className="text-sm text-gray-500 mt-1">
                Acompanhe o desempenho dos alunos matriculados em suas turmas.
              </p>
            </div>
            <Link
              href="/my-classes"
              className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
            >
              Gerenciar Matrículas
            </Link>
          </div>

          <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <label className="text-sm font-medium text-gray-700">
                Turma:
              </label>
              <select
                className="border rounded p-2 text-sm w-full md:w-64"
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                disabled={classes.length === 0}
              >
                <option value="all">Todas as Minhas Turmas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.class_name} ({c.year_semester})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <label className="text-sm font-medium text-gray-700">
                Ordenar por:
              </label>
              <select
                className="border rounded p-2 text-sm w-full md:w-48"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as 'name' | 'registration')
                }
              >
                <option value="name">Nome (A-Z)</option>
                <option value="registration">Matrícula</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <LoadingSpinner />
              <p className="text-gray-500 ml-2">Carregando...</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {displayedStudents.length === 0 && (
                  <li className="p-6 text-gray-500 text-center">
                    {classes.length === 0
                      ? 'Você ainda não possui turmas cadastradas.'
                      : 'Nenhum aluno encontrado para os filtros selecionados.'}
                  </li>
                )}
                {displayedStudents.map((student) => (
                  <li
                    key={student.id}
                    className="p-4 hover:bg-gray-50 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer"
                    onClick={() => openMetrics(student)}
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">
                        {student.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Matrícula: {student.registration_number}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openMetrics(student);
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-medium rounded border border-indigo-200 hover:bg-indigo-100 transition"
                    >
                      Ver Desempenho
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </main>
        <Footer />
      </div>

      {metricsStudent && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Desempenho do Aluno
                </h2>
                <p className="text-gray-500 text-sm">
                  {metricsStudent.name} ({metricsStudent.registration_number})
                </p>
              </div>
              <button
                onClick={() => setMetricsStudent(null)}
                className="text-gray-500 hover:text-black text-2xl"
              >
                &times;
              </button>
            </div>

            {loadingMetrics ? (
              <div className="flex justify-center p-8">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-blue-900">
                      Progresso Geral
                    </h3>
                    <p className="text-sm text-blue-700">
                      Questões resolvidas em todo o sistema.
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-blue-600">
                      {globalProgress?.total_solved_questions || 0}{' '}
                      <span className="text-lg text-blue-400">
                        / {globalProgress?.total_available_questions || 0}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-blue-500">
                      {globalProgress?.completion_percentage || 0}% Concluído
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
                      {scenarioProgress.map((sp, idx) => (
                        <div
                          key={idx}
                          className="border p-4 rounded-lg shadow-sm"
                        >
                          <div
                            className="font-semibold text-gray-800 mb-2 truncate"
                            title={sp.scenario_name}
                          >
                            {sp.scenario_name}
                          </div>
                          <div className="flex justify-between items-end">
                            <span className="text-2xl font-bold text-gray-700">
                              {sp.total_solved_questions}{' '}
                              <span className="text-sm font-normal text-gray-400">
                                / {sp.total_available_questions}
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
                              style={{ width: `${sp.completion_percentage}%` }}
                            ></div>
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
      )}
    </ProtectedRoute>
  );
}
