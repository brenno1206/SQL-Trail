/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState } from 'react';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AdminService } from '@/lib/services/admin';
import Toast from '@/components/Toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Teacher, Class } from '@/types/models';
import { Notification } from '@/types/ui';

/**
 * Página de gerenciamento de professores para administradores, permitindo criar, editar e excluir professores,
 * além de visualizar as turmas atribuídas a cada professor.
 * Funcionalidades principais:
 * - Listagem de professores com detalhes básicos.
 * - Modal para criação de novos professores.
 * - Modal para visualização e edição de detalhes do professor selecionado.
 * - Ação de exclusão de professor com confirmação.
 * - Visualização das turmas atribuídas a cada professor.
 * - Notificações para feedback de ações realizadas.
 */
export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    registration_number: '',
    password: '',
  });

  const showNotification = (
    message: string,
    type: 'success' | 'error' | 'warning',
  ) => {
    setNotification({ message, type });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [teachersData, classesData] = await Promise.all([
        AdminService.getAllTeachers(),
        AdminService.getAllClasses(),
      ]);
      setTeachers(teachersData);
      setClasses(classesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showNotification(
        `Erro ao carregar professores e turmas. ${error}`,
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await AdminService.createTeacher(formData);
      showNotification('Professor criado com sucesso!', 'success');
      setIsCreateModalOpen(false);
      setFormData({
        name: '',
        email: '',
        registration_number: '',
        password: '',
      });
      await loadData();
    } catch (error) {
      console.error(error);
      showNotification('Erro ao criar professor.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;
    setIsSubmitting(true);

    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        registration_number: formData.registration_number,
      };
      if (formData.password) payload.password = formData.password;

      await AdminService.editTeacher(selectedTeacher.id, payload);
      showNotification('Professor atualizado com sucesso!', 'success');
      setIsEditMode(false);
      await loadData();

      setSelectedTeacher({ ...selectedTeacher, ...payload });
    } catch (error) {
      console.error(error);
      showNotification('Erro ao editar professor.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeacher = async () => {
    if (!selectedTeacher) return;

    if (
      !window.confirm(
        'Tem certeza que deseja excluir este professor? Essa ação não pode ser desfeita.',
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      await AdminService.deleteTeacher(selectedTeacher.id);
      showNotification('Professor excluído com sucesso!', 'success');
      setSelectedTeacher(null);
      await loadData();
    } catch (error) {
      console.error(error);
      showNotification('Erro ao excluir professor.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openTeacherDetails = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsEditMode(false);
    setFormData({
      name: teacher.name,
      email: teacher.email || '',
      registration_number: teacher.registration_number || '',
      password: '',
    });
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      email: '',
      registration_number: '',
      password: '',
    });
    setIsCreateModalOpen(true);
  };

  const teacherClasses = classes.filter(
    (c) => c.teacher_id === selectedTeacher?.id,
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
            <h1 className="text-3xl font-bold text-gray-800">Professores</h1>
            <button
              onClick={openCreateModal}
              className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition cursor-pointer flex items-center"
            >
              + Novo Professor
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <LoadingSpinner />
              <p className="text-gray-500 ml-2">Carregando...</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {teachers.length === 0 && (
                  <li className="p-4 text-gray-500 text-center">
                    Nenhum professor encontrado.
                  </li>
                )}
                {teachers.map((teacher) => (
                  <li
                    key={teacher.id}
                    onClick={() => openTeacherDetails(teacher)}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition"
                  >
                    <div className="font-semibold text-gray-800">
                      {teacher.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      Matrícula: {teacher.registration_number} | {teacher.email}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </main>

        <Footer />
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Novo Professor</h2>
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
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  required
                  className="mt-1 block w-full border rounded p-2"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Senha Provisória
                </label>
                <input
                  type="password"
                  required
                  className="mt-1 block w-full border rounded p-2"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting && <LoadingSpinner />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTeacher && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {isEditMode ? 'Editar Professor' : 'Detalhes do Professor'}
              </h2>
              <button
                onClick={() => setSelectedTeacher(null)}
                className="text-gray-500 hover:text-black cursor-pointer text-xl p-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nome
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isEditMode || isSubmitting}
                    className="mt-1 block w-full border rounded p-2 disabled:bg-gray-100 disabled:text-gray-600"
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
                    disabled={!isEditMode || isSubmitting}
                    className="mt-1 block w-full border rounded p-2 disabled:bg-gray-100 disabled:text-gray-600"
                    value={formData.registration_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        registration_number: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    disabled={!isEditMode || isSubmitting}
                    className="mt-1 block w-full border rounded p-2 disabled:bg-gray-100 disabled:text-gray-600"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
                {isEditMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nova Senha (deixe em branco para não alterar)
                    </label>
                    <input
                      type="password"
                      disabled={isSubmitting}
                      className="mt-1 block w-full border rounded p-2 disabled:bg-gray-100"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleDeleteTeacher}
                  className="px-4 py-2 bg-red-100 text-red-700 border border-red-200 rounded hover:bg-red-200 transition cursor-pointer flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting && <LoadingSpinner />}
                  Excluir Professor
                </button>

                <div className="flex gap-2">
                  {isEditMode ? (
                    <>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => {
                          setIsEditMode(false);
                          setFormData({
                            name: selectedTeacher.name,
                            email: selectedTeacher.email || '',
                            registration_number:
                              selectedTeacher.registration_number || '',
                            password: '',
                          });
                        }}
                        className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isSubmitting && <LoadingSpinner />}
                        Salvar Alterações
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditMode(true)}
                      className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 cursor-pointer"
                    >
                      Editar Informações
                    </button>
                  )}
                </div>
              </div>
            </form>

            <hr className="my-6" />

            <div>
              <h3 className="text-xl font-bold mb-3">Turmas Atribuídas</h3>
              {teacherClasses.length === 0 ? (
                <p className="text-gray-500 italic">
                  Nenhuma turma atribuída a este professor.
                </p>
              ) : (
                <ul className="space-y-2">
                  {teacherClasses.map((c) => (
                    <li
                      key={c.id}
                      className="p-3 bg-gray-50 rounded border flex justify-between items-center"
                    >
                      <div>
                        <span className="font-semibold text-gray-800">
                          {c.class_name}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({c.subject})
                        </span>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {c.year_semester}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
