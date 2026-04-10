/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState } from 'react';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AdminService } from '@/lib/services/admin';
import LoadingSpinner from '@/components/LoadingSpinner';
import Toast from '@/components/Toast';
import { Student, Class, Scenario } from '@/types/models';
import { Notification } from '@/types/ui';
import { ProgressData } from '@/types/metrics';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const [filterClass, setFilterClass] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'registration'>('name');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [metricsStudent, setMetricsStudent] = useState<Student | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [globalProgress, setGlobalProgress] = useState<ProgressData | null>(
    null,
  );
  const [scenarioProgress, setScenarioProgress] = useState<ProgressData[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    registration_number: '',
    password: '',
  });

  const showNotification = (
    message: string,
    type: 'success' | 'error' | 'warning',
  ) => {
    setNotification({ message, type });
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [studentsData, classesData, scenariosData] = await Promise.all([
        AdminService.getAllStudents(),
        AdminService.getAllClasses(),
        AdminService.getAllScenarios(),
      ]);
      setStudents(studentsData);
      setClasses(classesData);
      setScenarios(scenariosData);
    } catch (error: any) {
      showNotification(`Erro ao carregar dados iniciais: ${error}.`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchFilteredStudents = async () => {
      setLoading(true);
      try {
        if (filterClass === 'all') {
          const all = await AdminService.getAllStudents();
          setStudents(all);
        } else {
          const filtered = await AdminService.getStudentsInClass(
            parseInt(filterClass),
          );
          setStudents(filtered);
        }
      } catch (error) {
        showNotification(`Erro ao filtrar alunos. ${error}`, 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchFilteredStudents();
  }, [filterClass]);

  const displayedStudents = [...students].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return a.registration_number.localeCompare(b.registration_number);
  });

  // --- HANDLERS DE CRUD ---

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await AdminService.createStudent({
        name: formData.name,
        registration_number: formData.registration_number,
      });
      showNotification('Aluno criado com sucesso!', 'success');
      setIsCreateModalOpen(false);
      setFilterClass('all');
      await loadInitialData();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao criar aluno.';
      showNotification(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setIsSubmitting(true);
    try {
      const payload: any = {
        name: formData.name,
        registration_number: formData.registration_number,
      };
      if (formData.password) payload.password = formData.password;

      await AdminService.editStudent(selectedStudent.id, payload);
      showNotification('Aluno atualizado com sucesso!', 'success');
      setIsEditMode(false);

      if (filterClass === 'all') await loadInitialData();
      else
        setStudents(
          await AdminService.getStudentsInClass(parseInt(filterClass)),
        );

      setSelectedStudent({ ...selectedStudent, ...payload });
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao editar aluno.';
      showNotification(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    if (
      !window.confirm(
        'Tem certeza que deseja excluir este aluno? Todos os seus dados, submissões e matrículas serão perdidos.',
      )
    )
      return;

    setIsSubmitting(true);
    try {
      await AdminService.deleteStudent(selectedStudent.id);
      showNotification('Aluno excluído com sucesso!', 'success');
      setSelectedStudent(null);
      if (filterClass === 'all') await loadInitialData();
      else
        setStudents(
          await AdminService.getStudentsInClass(parseInt(filterClass)),
        );
    } catch (error: any) {
      showNotification(
        error.response?.data?.error || 'Erro ao excluir.',
        'error',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- HANDLER DE MÉTRICAS ---

  const openMetrics = async (student: Student) => {
    setMetricsStudent(student);
    setLoadingMetrics(true);
    try {
      const global = await AdminService.getStudentProgress(student.id);
      setGlobalProgress(global);

      const perScenario = await Promise.all(
        scenarios.map(async (scen) => {
          const prog = await AdminService.getStudentProgress(student.id, {
            scenario_id: scen.id,
          });
          return { ...prog, scenario_name: scen.name };
        }),
      );
      setScenarioProgress(perScenario);
    } catch (error: any) {
      showNotification(
        `Erro ao carregar desempenho do aluno. ${error}`,
        'error',
      );
      setMetricsStudent(null);
    } finally {
      setLoadingMetrics(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
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
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Alunos</h1>
            <button
              onClick={() => {
                setFormData({
                  name: '',
                  registration_number: '',
                  password: '',
                });
                setIsCreateModalOpen(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
            >
              + Novo Aluno
            </button>
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
              >
                <option value="all">Todas as Turmas (Geral)</option>
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
                    Nenhum aluno encontrado para os filtros selecionados.
                  </li>
                )}
                {displayedStudents.map((student) => (
                  <li
                    key={student.id}
                    className="p-4 hover:bg-gray-50 transition flex justify-between items-center"
                  >
                    <div
                      className="cursor-pointer flex-1"
                      onClick={() => {
                        setSelectedStudent(student);
                        setIsEditMode(false);
                        setFormData({
                          name: student.name,
                          registration_number: student.registration_number,
                          password: '',
                        });
                      }}
                    >
                      <div className="font-semibold text-gray-800">
                        {student.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Matrícula: {student.registration_number}
                      </div>
                    </div>
                    <button
                      onClick={() => openMetrics(student)}
                      className="ml-4 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-medium rounded border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer"
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

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Novo Aluno</h2>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nome
                </label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border rounded p-2"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Matrícula
                </label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border rounded p-2"
                  value={formData.registration_number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      registration_number: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center disabled:opacity-70 cursor-pointer"
                >
                  {isSubmitting && <LoadingSpinner />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {isEditMode ? 'Editar Aluno' : 'Detalhes do Aluno'}
              </h2>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-gray-500 hover:text-black text-xl"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nome
                </label>
                <input
                  type="text"
                  required
                  disabled={!isEditMode}
                  className="mt-1 block w-full border rounded p-2 disabled:bg-gray-50"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Matrícula
                </label>
                <input
                  type="text"
                  required
                  disabled={!isEditMode}
                  className="mt-1 block w-full border rounded p-2 disabled:bg-gray-50"
                  value={formData.registration_number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      registration_number: e.target.value,
                    })
                  }
                />
              </div>
              {isEditMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nova Senha (opcional)
                  </label>
                  <input
                    type="password"
                    placeholder="Deixe em branco para não alterar"
                    className="mt-1 block w-full border rounded p-2"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                </div>
              )}

              <div className="pt-4 flex flex-col gap-2">
                {isEditMode ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      className="flex-1 px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded flex justify-center items-center disabled:opacity-70"
                    >
                      {isSubmitting && <LoadingSpinner />} Salvar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditMode(true)}
                    className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  >
                    Editar Dados
                  </button>
                )}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleDeleteStudent}
                  className="w-full px-4 py-2 bg-red-100 text-red-700 border border-red-200 rounded hover:bg-red-200 mt-2"
                >
                  Excluir Aluno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                      {globalProgress?.total_solved_questions}{' '}
                      <span className="text-lg text-blue-400">
                        / {globalProgress?.total_available_questions}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-blue-500">
                      {globalProgress?.completion_percentage}% Concluído
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
