/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState, useMemo } from 'react';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AdminService } from '@/lib/services/admin';
import LoadingSpinner from '@/components/LoadingSpinner';
import Toast from '@/components/Toast';
import {
  FaDatabase,
  IoIosWarning,
  IoMdCheckmarkCircleOutline,
  IoIosStarOutline,
  IoMdAttach,
  IoMdCloseCircleOutline,
} from '@/assets/icons';
import { Class, Teacher, Scenario, Question, Student } from '@/types/models';
import { DetailedQuestionMetric } from '@/types/metrics';
import { Notification } from '@/types/ui';

/**
 * Página de gerenciamento de turmas para administradores,
 * permitindo criar, editar, excluir turmas e gerenciar matrículas de alunos,
 * além de visualizar métricas de desempenho por turma.
 */
export default function AdminClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [activeTab, setActiveTab] = useState<'students' | 'metrics'>(
    'students',
  );

  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  const [classMetrics, setClassMetrics] = useState<DetailedQuestionMetric[]>(
    [],
  );
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  const [formData, setFormData] = useState({
    class_name: '',
    subject: '',
    year_semester: '',
    teacher_id: '',
  });

  const [enrollData, setEnrollData] = useState({
    matricula: '',
    nome: '',
  });

  const [bulkFile, setBulkFile] = useState<File | null>(null);

  const showNotification = (
    message: string,
    type: 'success' | 'error' | 'warning',
  ) => {
    setNotification({ message, type });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [classesData, teachersData, scenariosData, questionsData] =
        await Promise.all([
          AdminService.getAllClasses(),
          AdminService.getAllTeachers(),
          AdminService.getAllScenarios(),
          AdminService.getAllQuestions(),
        ]);
      setClasses(classesData);
      setTeachers(teachersData);
      setScenarios(scenariosData);
      setQuestions(questionsData);
    } catch (error: any) {
      showNotification(`Erro ao carregar dados. ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadClassStudents = async (classId: number) => {
    setIsLoadingStudents(true);
    try {
      const students = await AdminService.getStudentsInClass(classId);
      setClassStudents(students);
    } catch (error: any) {
      showNotification(`Erro ao buscar alunos ${error}.`, 'error');
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const loadClassMetrics = async (classId: number) => {
    setIsLoadingMetrics(true);
    try {
      const metrics = await AdminService.getClassQuestionsDetail(classId);
      setClassMetrics(metrics);
    } catch (error: any) {
      console.error(`Erro ao buscar métricas da turma ${error}`, error);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teacher_id)
      return showNotification('Selecione um professor.', 'warning');
    setIsSubmitting(true);
    try {
      await AdminService.createClass({
        class_name: formData.class_name,
        subject: formData.subject,
        year_semester: formData.year_semester,
        teacher_id: parseInt(formData.teacher_id),
      });
      showNotification('Turma criada com sucesso!', 'success');
      setIsCreateModalOpen(false);
      await loadData();
    } catch (error: any) {
      showNotification(`Erro ao criar turma. ${error}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    setIsSubmitting(true);
    try {
      const payload = {
        class_name: formData.class_name,
        subject: formData.subject,
        year_semester: formData.year_semester,
      };
      await AdminService.editClass(selectedClass.id, payload);
      showNotification('Turma atualizada com sucesso!', 'success');
      setIsEditMode(false);
      await loadData();
      setSelectedClass({ ...selectedClass, ...payload });
    } catch (error: any) {
      showNotification(`Erro ao atualizar.${error}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!selectedClass) return;
    if (!window.confirm('Tem certeza que deseja excluir esta turma?')) return;
    setIsSubmitting(true);
    try {
      await AdminService.deleteClass(selectedClass.id);
      showNotification('Turma excluída com sucesso!', 'success');
      setSelectedClass(null);
      await loadData();
    } catch (error: any) {
      showNotification(`Erro ao excluir.${error}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnrollSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    setIsSubmitting(true);
    try {
      await AdminService.enrollStudent(selectedClass.id, enrollData);
      showNotification('Aluno matriculado com sucesso!', 'success');
      setEnrollData({ matricula: '', nome: '' });
      await loadClassStudents(selectedClass.id);
    } catch (error: any) {
      showNotification(`Erro ao matricular. ${error}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !bulkFile)
      return showNotification('Selecione um arquivo.', 'warning');
    setIsSubmitting(true);
    try {
      await AdminService.enrollStudentsBulk(selectedClass.id, bulkFile);
      showNotification('Alunos importados com sucesso!', 'success');
      setBulkFile(null);
      (document.getElementById('file-upload') as HTMLInputElement).value = '';
      await loadClassStudents(selectedClass.id);
    } catch (error: any) {
      showNotification(`Erro ao processar arquivo. ${error}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveEnrollment = async (
    studentId: number,
    studentName: string,
  ) => {
    if (!selectedClass) return;
    if (
      !window.confirm(
        `Tem certeza que deseja remover ${studentName} desta turma?`,
      )
    )
      return;
    try {
      await AdminService.removeEnrollment(selectedClass.id, studentId);
      showNotification('Matrícula removida com sucesso.', 'success');
      await loadClassStudents(selectedClass.id);
    } catch (error: any) {
      showNotification(`Erro ao remover matrícula. ${error}`, 'error');
    }
  };

  const openClassDetails = (classroom: Class) => {
    setSelectedClass(classroom);
    setIsEditMode(false);
    setActiveTab('students');
    setFormData({
      class_name: classroom.class_name,
      subject: classroom.subject || '',
      year_semester: classroom.year_semester,
      teacher_id: classroom.teacher_id?.toString() || '',
    });
    setEnrollData({ matricula: '', nome: '' });
    setBulkFile(null);
    loadClassStudents(classroom.id);
    loadClassMetrics(classroom.id);
  };

  const openCreateModal = () => {
    setFormData({
      class_name: '',
      subject: '',
      year_semester: '',
      teacher_id: '',
    });
    setIsCreateModalOpen(true);
  };

  const getTeacherName = (teacherId: number) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    return teacher ? teacher.name : `ID: ${teacherId}`;
  };

  const getStudentName = (studentId: number) => {
    const student = classStudents.find((s) => s.id === studentId);
    return student ? student.name : `Matrícula Desconhecida (${studentId})`;
  };

  const groupedMetrics = useMemo(() => {
    const enriched = classMetrics.map((m) => {
      const q = questions.find((q) => q.id === m.question_id);
      const s = scenarios.find((sc) => sc.id === q?.scenario_database_id);
      return {
        ...m,
        question_number: q?.question_number || 0,
        is_special: q?.is_special || false,
        scenario_name: s?.name || 'Sem Cenário Vinculado',
      };
    });

    return enriched.reduce(
      (acc, curr) => {
        if (!acc[curr.scenario_name]) acc[curr.scenario_name] = [];
        acc[curr.scenario_name].push(curr);
        return acc;
      },
      {} as Record<string, typeof enriched>,
    );
  }, [classMetrics, questions, scenarios]);

  const totalClassAttempts = classMetrics.reduce(
    (acc, m) => acc + m.metrics.total_class_attempts,
    0,
  );
  const avgClassAccuracy =
    classMetrics.length > 0
      ? (
          classMetrics.reduce(
            (acc, m) => acc + m.metrics.accuracy_rate_percentage,
            0,
          ) / classMetrics.length
        ).toFixed(1)
      : 0;

  const renderMetricCard = (m: any) => (
    <div
      key={m.question_id}
      className="bg-white border p-4 rounded-lg shadow-sm flex flex-col gap-3"
    >
      <div className="flex justify-between items-center border-b pb-2">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-gray-800 text-lg">
            Questão {m.question_number}
          </span>
        </div>
        <span
          className={`text-xs font-bold px-2 py-1 rounded ${
            m.metrics.accuracy_rate_percentage >= 70
              ? 'bg-green-100 text-green-700'
              : m.metrics.accuracy_rate_percentage >= 40
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
          }`}
        >
          {m.metrics.accuracy_rate_percentage}% Acerto
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-600 bg-gray-50 p-3 rounded border border-gray-100">
        <div>
          <span className="font-semibold block text-gray-500">
            Acertos / Tentaram:
          </span>
          {m.metrics.students_correct_count} de{' '}
          {m.metrics.students_attempted_count} alunos
        </div>
        <div>
          <span className="font-semibold block text-gray-500">
            Média de Tentativas p/ Acerto:
          </span>
          {m.metrics.avg_attempts_to_correct}
        </div>
        <div className="col-span-2">
          <span className="font-semibold block text-gray-500">
            Tempo Médio p/ Acerto:
          </span>
          {m.metrics.avg_time_to_correct_seconds} segundos
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mt-2">
        <div className="flex-1 bg-green-50/50 p-3 rounded border border-green-100">
          <span className="flex items-center gap-1 text-xs font-bold text-green-800 mb-2">
            <IoMdCheckmarkCircleOutline className="text-base text-green-600" />{' '}
            Acertaram:
          </span>
          <ul className="text-xs text-green-700 space-y-1 max-h-28 overflow-y-auto custom-scrollbar pr-1">
            {m.students.correct_submissions.map((s: any) => (
              <li
                key={s.student_id}
                className="flex justify-between border-b border-green-100/50 pb-1 last:border-0"
              >
                <span className="truncate mr-2 font-medium">
                  {getStudentName(s.student_id)}
                </span>
                <span className="shrink-0 text-green-600">
                  {s.correct_time_spent_seconds}s ({s.total_attempts} tent.)
                </span>
              </li>
            ))}
            {m.students.correct_submissions.length === 0 && (
              <li className="text-green-600/60 italic">
                Nenhum aluno acertou.
              </li>
            )}
          </ul>
        </div>

        <div className="flex-1 bg-red-50/50 p-3 rounded border border-red-100">
          <span className="flex items-center gap-1 text-xs font-bold text-red-800 mb-2">
            <IoIosWarning className="text-base text-red-600" /> Ainda Tentando:
          </span>
          <ul className="text-xs text-red-700 space-y-1 max-h-28 overflow-y-auto custom-scrollbar pr-1">
            {m.students.still_trying.map((s: any) => (
              <li
                key={s.student_id}
                className="flex justify-between border-b border-red-100/50 pb-1 last:border-0"
              >
                <span className="truncate mr-2 font-medium">
                  {getStudentName(s.student_id)}
                </span>
                <span className="shrink-0 text-red-600">
                  ({s.total_attempts} tent.)
                </span>
              </li>
            ))}
            {m.students.still_trying.length === 0 && (
              <li className="text-red-600/60 italic">Nenhum aluno pendente.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );

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
            <h1 className="text-3xl font-bold text-gray-800">Turmas</h1>
            <button
              onClick={openCreateModal}
              className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition cursor-pointer flex items-center"
            >
              + Nova Turma
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <LoadingSpinner />
              <p className="text-gray-500 ml-2">Carregando...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.length === 0 && (
                <div className="col-span-full p-4 text-gray-500 text-center bg-white rounded-lg shadow">
                  Nenhuma turma encontrada.
                </div>
              )}
              {classes.map((classroom) => (
                <div
                  key={classroom.id}
                  onClick={() => openClassDetails(classroom)}
                  className="bg-white p-5 rounded-lg shadow hover:shadow-md cursor-pointer transition border border-transparent hover:border-blue-200"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-gray-800">
                      {classroom.class_name}
                    </h3>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                      {classroom.year_semester}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold">Disciplina:</span>{' '}
                    {classroom.subject}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Professor:</span>{' '}
                    {getTeacherName(classroom.teacher_id || 0)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </main>
        <Footer />
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Nova Turma</h2>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Professor Responsável
                </label>
                <select
                  required
                  className="mt-1 block w-full border rounded p-2 bg-white"
                  value={formData.teacher_id}
                  onChange={(e) =>
                    setFormData({ ...formData, teacher_id: e.target.value })
                  }
                >
                  <option value="" disabled>
                    Selecione um professor
                  </option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nome da Turma
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Banco de Dados A"
                  className="mt-1 block w-full border rounded p-2"
                  value={formData.class_name}
                  onChange={(e) =>
                    setFormData({ ...formData, class_name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Disciplina
                </label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border rounded p-2"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Ano/Semestre
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 2026/1"
                  className="mt-1 block w-full border rounded p-2"
                  value={formData.year_semester}
                  onChange={(e) =>
                    setFormData({ ...formData, year_semester: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer flex items-center justify-center disabled:opacity-70"
                >
                  {isSubmitting && <LoadingSpinner />} Salvar Turma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedClass && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-gray-200 pb-6 md:pb-0 md:pr-6 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {isEditMode ? 'Editar Turma' : 'Detalhes da Turma'}
                </h2>
                <button
                  onClick={() => setSelectedClass(null)}
                  className="md:hidden text-gray-500 hover:text-black cursor-pointer text-2xl transition"
                >
                  <IoMdCloseCircleOutline />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Professor
                  </label>
                  <input
                    type="text"
                    disabled
                    className="mt-1 block w-full border rounded p-2 bg-gray-100 text-gray-500"
                    value={getTeacherName(selectedClass.teacher_id || 0)}
                  />
                  <span className="text-xs text-gray-400">
                    O dono da turma não pode ser alterado.
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nome da Turma
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isEditMode || isSubmitting}
                    className="mt-1 block w-full border rounded p-2 disabled:bg-gray-50"
                    value={formData.class_name}
                    onChange={(e) =>
                      setFormData({ ...formData, class_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Disciplina
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isEditMode || isSubmitting}
                    className="mt-1 block w-full border rounded p-2 disabled:bg-gray-50"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Ano/Semestre
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isEditMode || isSubmitting}
                    className="mt-1 block w-full border rounded p-2 disabled:bg-gray-50"
                    value={formData.year_semester}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        year_semester: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="pt-4 flex flex-col gap-2">
                  {isEditMode ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditMode(false);
                          setFormData({
                            class_name: selectedClass.class_name,
                            subject: selectedClass.subject || '',
                            year_semester: selectedClass.year_semester,
                            teacher_id:
                              selectedClass.teacher_id?.toString() || '',
                          });
                        }}
                        className="flex-1 px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center justify-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isSubmitting && <LoadingSpinner />} Salvar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditMode(true)}
                      className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition cursor-pointer"
                    >
                      Editar Dados da Turma
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleDeleteClass}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 border border-red-200 rounded hover:bg-red-200 transition disabled:opacity-50 mt-4 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <IoIosWarning className="text-lg" /> Excluir Turma
                  </button>
                </div>
              </form>
            </div>

            <div className="w-full md:w-2/3 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-4 border-b">
                <div className="flex gap-6">
                  <button
                    onClick={() => setActiveTab('students')}
                    className={`pb-2 text-lg font-bold transition-colors cursor-pointer ${activeTab === 'students' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Alunos Matriculados
                  </button>
                  <button
                    onClick={() => setActiveTab('metrics')}
                    className={`pb-2 text-lg font-bold transition-colors cursor-pointer ${activeTab === 'metrics' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Desempenho Geral
                  </button>
                </div>
                <button
                  onClick={() => setSelectedClass(null)}
                  className="hidden md:block text-gray-500 hover:text-black cursor-pointer text-3xl transition mb-2"
                >
                  <IoMdCloseCircleOutline />
                </button>
              </div>

              {activeTab === 'students' && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200 space-y-4 shrink-0">
                    <form
                      onSubmit={handleEnrollSingle}
                      className="flex gap-2 items-end"
                    >
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Matrícula
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: 2023101"
                          className="block w-full border rounded p-1.5 text-sm"
                          value={enrollData.matricula}
                          onChange={(e) =>
                            setEnrollData({
                              ...enrollData,
                              matricula: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Nome do Aluno
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: João Silva"
                          className="block w-full border rounded p-1.5 text-sm"
                          value={enrollData.nome}
                          onChange={(e) =>
                            setEnrollData({
                              ...enrollData,
                              nome: e.target.value,
                            })
                          }
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 transition h-[34px] cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Adicionar
                      </button>
                    </form>
                    <hr className="border-gray-300" />
                    <form
                      onSubmit={handleBulkEnroll}
                      className="flex flex-col gap-2"
                    >
                      <label className="flex items-center gap-1 text-xs font-medium text-gray-600">
                        <IoMdAttach className="text-base" /> Importar em Lote
                        (CSV/XLSX com colunas &apos;matricula&apos; e
                        &apos;nome&apos;)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="file"
                          id="file-upload"
                          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                          onChange={(e) =>
                            setBulkFile(
                              e.target.files ? e.target.files[0] : null,
                            )
                          }
                          className="flex-1 block w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border rounded cursor-pointer"
                        />
                        <button
                          type="submit"
                          disabled={!bulkFile || isSubmitting}
                          className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Importar
                        </button>
                      </div>
                    </form>
                  </div>
                  <div className="flex-1 overflow-y-auto bg-white border rounded-lg">
                    {isLoadingStudents ? (
                      <div className="flex items-center justify-center p-6 text-gray-500">
                        <LoadingSpinner />{' '}
                        <span className="ml-2 text-sm">
                          Carregando alunos...
                        </span>
                      </div>
                    ) : classStudents.length === 0 ? (
                      <div className="p-6 text-center text-sm text-gray-500 italic">
                        Nenhum aluno matriculado nesta turma.
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {classStudents.map((student) => (
                          <li
                            key={student.id}
                            className="p-3 flex justify-between items-center hover:bg-gray-50"
                          >
                            <div>
                              <p className="font-medium text-gray-800 text-sm">
                                {student.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                Matrícula: {student.registration_number}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                handleRemoveEnrollment(student.id, student.name)
                              }
                              className="flex items-center gap-1 text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 transition cursor-pointer"
                            >
                              <IoMdCloseCircleOutline className="text-base" />{' '}
                              Remover
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'metrics' && (
                <div className="flex flex-col flex-1 overflow-hidden bg-gray-50 border rounded-lg p-4">
                  {isLoadingMetrics ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <LoadingSpinner />
                      <span className="mt-4 text-sm">
                        Apurando métricas detalhadas da turma...
                      </span>
                    </div>
                  ) : classMetrics.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center text-gray-500 italic p-6">
                      Nenhum dado de submissão encontrado. A turma ainda não
                      resolveu questões.
                    </div>
                  ) : (
                    <div className="flex flex-col h-full gap-4 overflow-hidden">
                      <div className="bg-blue-100 p-4 rounded-lg flex justify-between items-center border border-blue-200 shrink-0 shadow-sm">
                        <div>
                          <p className="text-sm text-blue-800 font-bold mb-1">
                            Taxa de Acerto Geral (Média)
                          </p>
                          <p className="text-3xl font-black text-blue-700">
                            {avgClassAccuracy}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-blue-900">
                            Questões Engajadas:{' '}
                            <span className="font-bold">
                              {classMetrics.length}
                            </span>
                          </p>
                          <p className="text-sm font-medium text-blue-900 mt-1">
                            Total de Tentativas:{' '}
                            <span className="font-bold">
                              {totalClassAttempts}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                        {Object.entries(groupedMetrics).map(
                          ([scenarioName, metricsList]) => {
                            const specialQs = metricsList
                              .filter((m) => m.is_special)
                              .sort(
                                (a, b) => a.question_number - b.question_number,
                              );
                            const normalQs = metricsList
                              .filter((m) => !m.is_special)
                              .sort(
                                (a, b) => a.question_number - b.question_number,
                              );

                            return (
                              <div
                                key={scenarioName}
                                className="bg-gray-100/50 p-3 rounded-xl border border-gray-200"
                              >
                                <h3 className="text-md font-black text-gray-700 mb-4 uppercase tracking-wider flex items-center gap-2">
                                  <FaDatabase className="text-gray-500" /> Banco
                                  de Dados: {scenarioName}
                                </h3>

                                {specialQs.length > 0 && (
                                  <div className="mb-6 ml-2">
                                    <h4 className="text-sm font-bold text-purple-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                                      <IoIosStarOutline className="text-lg" />{' '}
                                      Questões Especiais
                                    </h4>
                                    <div className="space-y-4">
                                      {specialQs.map((m) =>
                                        renderMetricCard(m),
                                      )}
                                    </div>
                                  </div>
                                )}

                                {normalQs.length > 0 && (
                                  <div className="ml-2">
                                    <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                                      Trilha Padrão
                                    </h4>
                                    <div className="space-y-4">
                                      {normalQs.map((m) => renderMetricCard(m))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
