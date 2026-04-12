/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState } from 'react';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AdminService } from '@/lib/services/admin';
import Toast from '@/components/Toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Admin } from '@/types/models';
import { Notification } from '@/types/ui';

/**
 * Página de gerenciamento de administradores. Permite criar, editar e excluir administradores do sistema.
 * Funcionalidades:
 * - Listagem de administradores existentes
 * - Criação de novo administrador com nome, email e senha provisória
 * - Edição de informações do administrador (nome, email e senha)
 * - Exclusão de administrador com confirmação
 * - Feedback visual para ações realizadas (sucesso/erro)
 *
 * Acesso restrito a usuários com papel "admin".
 */
export default function AdminAdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
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
      const adminsData = await AdminService.getAllAdmins();
      setAdmins(adminsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showNotification('Erro ao carregar administradores.', 'error');
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
      await AdminService.createAdmin(formData);
      showNotification('Administrador criado com sucesso!', 'success');
      setIsCreateModalOpen(false);
      setFormData({
        name: '',
        email: '',
        password: '',
      });
      await loadData();
    } catch (error) {
      console.error(error);
      showNotification('Erro ao criar administrador.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    setIsSubmitting(true);

    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
      };
      if (formData.password) payload.password = formData.password;

      await AdminService.editAdmin(selectedAdmin.id, payload);
      showNotification('Administrador atualizado com sucesso!', 'success');
      setIsEditMode(false);
      await loadData();

      setSelectedAdmin({ ...selectedAdmin, ...payload });
    } catch (error) {
      console.error(error);
      showNotification('Erro ao editar administrador.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;

    if (
      !window.confirm(
        'Tem certeza que deseja excluir este administrador? Essa ação não pode ser desfeita.',
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      await AdminService.deleteAdmin(selectedAdmin.id);
      showNotification('Administrador excluído com sucesso!', 'success');
      setSelectedAdmin(null);
      await loadData();
    } catch (error) {
      console.error(error);
      showNotification('Erro ao excluir administrador.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAdminDetails = (admin: Admin) => {
    setSelectedAdmin(admin);
    setIsEditMode(false);
    setFormData({
      name: admin.name,
      email: admin.email,
      password: '',
    });
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
    });
    setIsCreateModalOpen(true);
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
            <h1 className="text-3xl font-bold text-gray-800">
              Administradores
            </h1>
            <button
              onClick={openCreateModal}
              className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition cursor-pointer flex items-center"
            >
              + Novo Admin
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
                {admins.length === 0 && (
                  <li className="p-4 text-gray-500 text-center">
                    Nenhum administrador encontrado.
                  </li>
                )}
                {admins.map((admin) => (
                  <li
                    key={admin.id}
                    onClick={() => openAdminDetails(admin)}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition"
                  >
                    <div className="font-semibold text-gray-800">
                      {admin.name}
                    </div>
                    <div className="text-sm text-gray-500">{admin.email}</div>
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
            <h2 className="text-2xl font-bold mb-4">Novo Administrador</h2>
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

      {selectedAdmin && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {isEditMode
                  ? 'Editar Administrador'
                  : 'Detalhes do Administrador'}
              </h2>
              <button
                onClick={() => setSelectedAdmin(null)}
                className="text-gray-500 hover:text-black cursor-pointer text-xl p-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
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
                <div className="col-span-2 md:col-span-1">
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
                  <div className="col-span-2">
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

              <div className="flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-4 pt-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleDeleteAdmin}
                  className="w-full sm:w-auto px-4 py-2 bg-red-100 text-red-700 border border-red-200 rounded hover:bg-red-200 transition cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting && <LoadingSpinner />}
                  Excluir Admin
                </button>

                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  {isEditMode ? (
                    <>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => {
                          setIsEditMode(false);
                          setFormData({
                            name: selectedAdmin.name,
                            email: selectedAdmin.email,
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
                        Salvar
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditMode(true)}
                      className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 cursor-pointer w-full sm:w-auto"
                    >
                      Editar Informações
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
