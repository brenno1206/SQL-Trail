/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState } from 'react';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AdminService } from '@/lib/services/admin';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Teacher {
  id: number;
  name: string;
}

interface ClassItem {
  id: number;
  teacher_id: number;
  class_name: string;
  subject: string;
  year_semester: string;
}

interface Student {
  id: number;
  name: string;
  registration_number: string;
}

interface Notification {
  message: string;
  type: 'success' | 'error' | 'warning';
}

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

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
    setTimeout(() => setNotification(null), 10000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [classesData, teachersData] = await Promise.all([
        AdminService.getAllClasses(),
        AdminService.getAllTeachers(),
      ]);
      setClasses(classesData);
      setTeachers(teachersData);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Erro ao carregar turma.';
      showNotification(errorMessage, 'error');
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
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Erro ao buscar alunos da turma.';
      showNotification(errorMessage, 'error');
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teacher_id) {
      showNotification('Selecione um professor.', 'warning');
      return;
    }

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
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Erro ao criar turma.';
      showNotification(errorMessage, 'error');
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
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Erro ao criar turma.';
      showNotification(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!selectedClass) return;

    if (
      !window.confirm(
        'Tem certeza que deseja excluir esta turma? Todos os vínculos serão perdidos.',
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      await AdminService.deleteClass(selectedClass.id);
      showNotification('Turma excluída com sucesso!', 'success');
      setSelectedClass(null);
      await loadData();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Erro ao criar turma.';
      showNotification(errorMessage, 'error');
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
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Erro ao criar turma.';
      showNotification(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !bulkFile) {
      showNotification('Selecione um arquivo CSV ou Excel.', 'warning');
      return;
    }
    setIsSubmitting(true);

    try {
      await AdminService.enrollStudentsBulk(selectedClass.id, bulkFile);
      showNotification('Alunos importados com sucesso!', 'success');
      setBulkFile(null);
      (document.getElementById('file-upload') as HTMLInputElement).value = '';
      await loadClassStudents(selectedClass.id);
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error || 'Erro ao processar arquivo.';
      showNotification(errorMsg, 'error');
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
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Erro ao criar turma.';
      showNotification(errorMessage, 'error');
    }
  };

  const openClassDetails = (classroom: ClassItem) => {
    setSelectedClass(classroom);
    setIsEditMode(false);
    setFormData({
      class_name: classroom.class_name,
      subject: classroom.subject,
      year_semester: classroom.year_semester,
      teacher_id: classroom.teacher_id.toString(),
    });
    setEnrollData({ matricula: '', nome: '' });
    setBulkFile(null);
    loadClassStudents(classroom.id);
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-gray-50 relative">
        <Header />

        {notification && (
          <div
            className={`fixed top-4 right-4 z-60 px-6 py-3 rounded-md shadow-lg text-white font-medium transition-all duration-300 animate-fade-in-down ${
              notification.type === 'success'
                ? 'bg-green-500'
                : notification.type === 'error'
                  ? 'bg-red-500'
                  : 'bg-yellow-500 text-gray-900'
            }`}
          >
            {notification.message}
          </div>
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
                    {getTeacherName(classroom.teacher_id)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </main>
        <Footer />
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
                  {isSubmitting && <LoadingSpinner />}
                  Salvar Turma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row gap-6">
            <div className="flex-1 border-b md:border-b-0 md:border-r border-gray-200 pb-6 md:pb-0 md:pr-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {isEditMode ? 'Editar Turma' : 'Detalhes da Turma'}
                </h2>
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
                    value={getTeacherName(selectedClass.teacher_id)}
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
                            subject: selectedClass.subject,
                            year_semester: selectedClass.year_semester,
                            teacher_id: selectedClass.teacher_id.toString(),
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
                        {isSubmitting && <LoadingSpinner />}
                        Salvar
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
                    className="w-full px-4 py-2 bg-red-100 text-red-700 border border-red-200 rounded hover:bg-red-200 transition disabled:opacity-50 mt-4 cursor-pointer disabled:cursor-not-allowed"
                  >
                    Excluir Turma
                  </button>
                </div>
              </form>
            </div>

            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  Alunos Matriculados
                </h3>
                <button
                  onClick={() => setSelectedClass(null)}
                  className="text-gray-500 hover:text-black cursor-pointer text-2xl leading-none"
                >
                  &times;
                </button>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200 space-y-4">
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
                        setEnrollData({ ...enrollData, nome: e.target.value })
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
                  <label className="block text-xs font-medium text-gray-600">
                    Importar em Lote (CSV/XLSX com colunas &apos;matricula&apos;
                    e &apos;nome&apos;)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      id="file-upload"
                      accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                      onChange={(e) =>
                        setBulkFile(e.target.files ? e.target.files[0] : null)
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

              <div className="flex-1 overflow-y-auto bg-white border rounded-lg max-h-[300px]">
                {isLoadingStudents ? (
                  <div className="flex items-center justify-center p-6 text-gray-500">
                    <LoadingSpinner />{' '}
                    <span className="ml-2 text-sm">Carregando alunos...</span>
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
                          className="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 transition"
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
