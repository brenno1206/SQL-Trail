'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import ProtectedRoute from '@/components/ProtectedRoute';
import { teacherService } from '@/lib/services/teacher';
import { getErrorMessage } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import Toast from '@/components/Toast';
import AccessCodesModal from '@/components/AccessCodesModal';
import StudentProgressModal from '@/components/StudentProgressModal';
import { Student, Class, Scenario, CreatedStudentCode } from '@/types/models';
import { ProgressData } from '@/types/metrics';
import { Notification } from '@/types/ui';

/** "Todas as Minhas Turmas" usa /auth/students, que já retorna apenas os alunos do professor */
const fetchStudents = (classFilter: string) =>
  classFilter === 'all'
    ? teacherService.getStudents()
    : teacherService.getStudentsInClass(parseInt(classFilter));

/**
 * Página para professores visualizarem os alunos das suas turmas, filtrar por turma,
 * acompanhar o desempenho e gerar novos códigos de primeiro acesso.
 * Acessível apenas para usuários com o papel de professor.
 */
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

  const [accessCodes, setAccessCodes] = useState<CreatedStudentCode[] | null>(
    null,
  );
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);

  const showNotification = (
    message: string,
    type: 'success' | 'error' | 'warning',
  ) => {
    setNotification({ message, type });
  };

  // Turmas e cenários: carregados uma única vez.
  useEffect(() => {
    const loadStaticData = async () => {
      try {
        const [classesData, scenariosData] = await Promise.all([
          teacherService.getMyClasses(),
          teacherService.getAllScenarios(),
        ]);
        setClasses(classesData);
        setScenarios(scenariosData);
      } catch (error) {
        showNotification(
          getErrorMessage(error, 'Erro ao carregar turmas e cenários.'),
          'error',
        );
      }
    };
    loadStaticData();
  }, []);

  // Alunos: uma busca na montagem e a cada mudança do filtro de turma.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchStudents(filterClass);
        if (!cancelled) setStudents(data);
      } catch (error) {
        if (!cancelled) {
          showNotification(
            getErrorMessage(error, 'Erro ao buscar alunos.'),
            'error',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [filterClass]);

  const displayedStudents = [...students].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return a.registration_number.localeCompare(b.registration_number);
  });

  const openMetrics = async (student: Student) => {
    setMetricsStudent(student);
    setLoadingMetrics(true);
    try {
      const [global, ...perScenario] = await Promise.all([
        teacherService.getStudentProgress(student.id),
        ...scenarios.map((scen) =>
          teacherService.getStudentProgress(student.id, {
            scenario_id: scen.id,
          }),
        ),
      ]);
      setGlobalProgress(global);
      setScenarioProgress(
        perScenario.map((prog, idx) => ({
          ...prog,
          scenario_name: scenarios[idx].name,
        })),
      );
    } catch (error) {
      showNotification(
        getErrorMessage(error, 'Erro ao carregar desempenho do aluno.'),
        'error',
      );
      setMetricsStudent(null);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleRegenerateCode = async (student: Student) => {
    if (
      !window.confirm(
        `Gerar um novo código de acesso para ${student.name}? A senha atual do aluno será removida e ele precisará refazer o primeiro acesso.`,
      )
    )
      return;
    setRegeneratingId(student.id);
    try {
      const result = await teacherService.regenerateAccessCode(student.id);
      setAccessCodes([
        {
          registration_number: result.student.registration_number,
          name: result.student.name,
          access_code: result.access_code,
        },
      ]);
      setStudents((prev) =>
        prev.map((s) =>
          s.id === student.id ? { ...s, first_access_pending: true } : s,
        ),
      );
    } catch (error) {
      showNotification(
        getErrorMessage(error, 'Erro ao gerar novo código de acesso.'),
        'error',
      );
    } finally {
      setRegeneratingId(null);
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
                      <div className="font-semibold text-gray-800 flex items-center gap-2">
                        {student.name}
                        {student.first_access_pending && (
                          <span className="text-xs font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                            Primeiro acesso pendente
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        Matrícula: {student.registration_number}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRegenerateCode(student);
                        }}
                        disabled={regeneratingId === student.id}
                        className="w-full sm:w-auto px-4 py-2 bg-amber-50 text-amber-800 text-sm font-medium rounded border border-amber-200 hover:bg-amber-100 transition cursor-pointer disabled:opacity-50"
                      >
                        {regeneratingId === student.id
                          ? 'Gerando...'
                          : 'Gerar novo código de acesso'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openMetrics(student);
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-medium rounded border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer"
                      >
                        Ver Desempenho
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </main>
        <Footer />
      </div>

      {metricsStudent && (
        <StudentProgressModal
          student={metricsStudent}
          loading={loadingMetrics}
          globalProgress={globalProgress}
          scenarioProgress={scenarioProgress}
          onClose={() => setMetricsStudent(null)}
        />
      )}

      {accessCodes && (
        <AccessCodesModal
          codes={accessCodes}
          onClose={() => setAccessCodes(null)}
        />
      )}
    </ProtectedRoute>
  );
}
