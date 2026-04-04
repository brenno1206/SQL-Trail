/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState } from 'react';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AdminService } from '@/lib/services/admin';

interface Admin {
  id: number;
  name: string;
  email: string;
}

interface Notification {
  message: string;
  type: 'success' | 'error' | 'warning';
}

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
    setTimeout(() => {
      setNotification(null);
    }, 10000);
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

  const LoadingSpinner = () => (
    <svg
      className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );

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
