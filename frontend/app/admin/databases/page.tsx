/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState } from 'react';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AdminService } from '@/lib/services/admin';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Scenario {
  id: number;
  name: string;
  slug: string;
}

interface Question {
  id: number;
  scenario_database_id: number;
  statement: string;
  expected_query: string;
  difficulty: number;
  is_special: boolean;
}

interface Notification {
  message: string;
  type: 'success' | 'error' | 'warning';
}

export default function AdminDatabasesPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
  const [scenarioFormData, setScenarioFormData] = useState({
    name: '',
    slug: '',
    id: 0,
  });

  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [questionFormData, setQuestionFormData] = useState({
    id: 0,
    statement: '',
    expected_query: '',
    difficulty: 1,
    is_special: false,
  });

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
      const [scenariosData, questionsData] = await Promise.all([
        AdminService.getAllScenarios(),
        AdminService.getAllQuestions(),
      ]);
      setScenarios(scenariosData);
      setQuestions(questionsData);
    } catch (error: any) {
      showNotification(
        `Erro ao carregar cenários e questões. ${error}`,
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

  const handleSaveScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const diagramUrl = `/${scenarioFormData.slug}.png`;

      if (scenarioFormData.id) {
        await AdminService.editScenario(scenarioFormData.slug, {
          name: scenarioFormData.name,
          slug: scenarioFormData.slug,
          diagram_url: diagramUrl,
        });
        showNotification('Database atualizado com sucesso!', 'success');
        if (selectedScenario && selectedScenario.id === scenarioFormData.id) {
          setSelectedScenario({
            ...selectedScenario,
            name: scenarioFormData.name,
            slug: scenarioFormData.slug,
          });
        }
      } else {
        await AdminService.createScenario({
          name: scenarioFormData.name,
          slug: scenarioFormData.slug,
          diagram_url: diagramUrl,
        });
        showNotification('Database criado com sucesso!', 'success');
      }
      setIsScenarioModalOpen(false);
      await loadData();
    } catch (error: any) {
      showNotification(
        error.response?.data?.error || 'Erro ao salvar database.',
        'error',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteScenario = async (slug: string) => {
    if (
      !window.confirm('Tem certeza? Isso apagará todas as questões vinculadas.')
    )
      return;
    setIsSubmitting(true);
    try {
      await AdminService.deleteScenario(slug);
      showNotification('Database excluído com sucesso.', 'success');
      setSelectedScenario(null);
      await loadData();
    } catch (error: any) {
      showNotification(`Erro ao excluir database. ${error}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScenario) return;
    setIsSubmitting(true);
    try {
      const payload = {
        scenario_database_id: selectedScenario.id,
        statement: questionFormData.statement,
        expected_query: questionFormData.expected_query,
        difficulty: questionFormData.difficulty,
        is_special: questionFormData.is_special,
      };

      if (questionFormData.id) {
        await AdminService.editQuestion(questionFormData.id, payload);
        showNotification('Questão atualizada com sucesso!', 'success');
      } else {
        await AdminService.createQuestion(payload);
        showNotification('Questão criada com sucesso!', 'success');
      }
      setIsQuestionModalOpen(false);
      await loadData();
    } catch (error: any) {
      showNotification(
        error.response?.data?.error || 'Erro ao salvar questão.',
        'error',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir esta questão?')) return;
    setIsSubmitting(true);
    try {
      await AdminService.deleteQuestion(id);
      showNotification('Questão excluída.', 'success');
      await loadData();
    } catch (error: any) {
      showNotification(`Erro ao excluir questão. ${error}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scenarioQuestions = questions.filter(
    (q) => q.scenario_database_id === selectedScenario?.id,
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-gray-50 relative">
        <Header />

        {notification && (
          <div
            className={`fixed top-4 right-4 z-60 px-6 py-3 rounded-md shadow-lg text-white font-medium transition-all ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
          >
            {notification.message}
          </div>
        )}

        <main className="grow max-w-7xl w-full mx-auto p-6 flex flex-col lg:flex-row gap-6">
          <div
            className={`${selectedScenario ? 'hidden lg:block lg:w-1/3' : 'w-full'} flex flex-col`}
          >
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-gray-800">Databases</h1>
              <button
                onClick={() => {
                  setScenarioFormData({ id: 0, name: '', slug: '' });
                  setIsScenarioModalOpen(true);
                }}
                className="bg-blue-600 text-white px-3 py-1.5 rounded shadow hover:bg-blue-700 text-sm cursor-pointer"
              >
                + Novo
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center p-8">
                <LoadingSpinner />
              </div>
            ) : (
              <ul className="bg-white rounded-lg shadow divide-y divide-gray-200">
                {scenarios.map((scen) => (
                  <li
                    key={scen.id}
                    className={`p-4 cursor-pointer hover:bg-blue-50 transition ${selectedScenario?.id === scen.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
                    onClick={() => setSelectedScenario(scen)}
                  >
                    <div className="font-bold text-gray-800">{scen.name}</div>
                    <div className="text-xs text-gray-500">
                      Slug: {scen.slug}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedScenario && (
            <div className="w-full lg:w-2/3 bg-white rounded-lg shadow p-6 flex flex-col">
              <div className="flex justify-between items-start mb-6 pb-4 border-b">
                <div>
                  <button
                    onClick={() => setSelectedScenario(null)}
                    className="text-sm text-blue-600 hover:underline lg:hidden mb-2 cursor-pointer"
                  >
                    ← Voltar aos Databases
                  </button>
                  <h2 className="text-3xl font-bold text-gray-800">
                    {selectedScenario.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Slug: {selectedScenario.slug}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setScenarioFormData({
                        id: selectedScenario.id,
                        name: selectedScenario.name,
                        slug: selectedScenario.slug,
                      });
                      setIsScenarioModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 cursor-pointer"
                  >
                    Editar DB
                  </button>
                  <button
                    onClick={() => handleDeleteScenario(selectedScenario.slug)}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 border border-red-200 cursor-pointer"
                  >
                    Excluir
                  </button>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-800 mb-3">
                  Diagrama Entidade-Relacionamento
                </h3>
                <div className="bg-gray-100 p-4 rounded border flex justify-center items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/${selectedScenario.slug}.png`}
                    alt={`Diagrama de ${selectedScenario.name}`}
                    className="max-w-full max-h-[400px] object-contain rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2 italic">
                  * A imagem deve estar localizada em public/
                  {selectedScenario.slug}.png
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800">
                    Questões ({scenarioQuestions.length})
                  </h3>
                  <button
                    onClick={() => {
                      setQuestionFormData({
                        id: 0,
                        statement: '',
                        expected_query: '',
                        difficulty: 1,
                        is_special: false,
                      });
                      setIsQuestionModalOpen(true);
                    }}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 cursor-pointer"
                  >
                    + Nova Questão
                  </button>
                </div>

                <div className="space-y-4">
                  {scenarioQuestions.length === 0 && (
                    <p className="text-gray-500 text-sm italic">
                      Nenhuma questão cadastrada neste database.
                    </p>
                  )}
                  {scenarioQuestions.map((q) => (
                    <div
                      key={q.id}
                      className={`border rounded p-4 ${q.is_special ? 'border-purple-300 bg-purple-50' : 'bg-gray-50'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-2 items-center">
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-bold ${
                              q.difficulty <= 10
                                ? 'bg-green-100 text-green-800'
                                : q.difficulty <= 30
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}
                          >
                            Nível {q.difficulty}
                          </span>
                          {q.is_special && (
                            <span className="text-xs px-2 py-0.5 rounded font-bold bg-purple-200 text-purple-800">
                              Especial
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setQuestionFormData({
                                id: q.id,
                                statement: q.statement,
                                expected_query: q.expected_query,
                                difficulty: q.difficulty,
                                is_special: q.is_special,
                              });
                              setIsQuestionModalOpen(true);
                            }}
                            className="text-blue-600 hover:underline text-sm font-medium cursor-pointer"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="text-red-600 hover:underline text-sm font-medium cursor-pointer"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-800 mb-2">
                        {q.statement}
                      </p>
                      <div className="bg-gray-800 text-green-400 p-2 rounded text-xs font-mono overflow-x-auto">
                        {q.expected_query}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
        <Footer />
      </div>

      {isScenarioModalOpen && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {scenarioFormData.id ? 'Editar Database' : 'Novo Database'}
            </h2>
            <form onSubmit={handleSaveScenario} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nome do Database
                </label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border rounded p-2"
                  value={scenarioFormData.name}
                  onChange={(e) =>
                    setScenarioFormData({
                      ...scenarioFormData,
                      name: e.target.value,
                    })
                  }
                  placeholder="Ex: Biblioteca Universitária"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Slug (URL / Nome da Imagem)
                </label>
                <input
                  type="text"
                  required
                  disabled={!!scenarioFormData.id}
                  className="mt-1 block w-full border rounded p-2 disabled:bg-gray-100"
                  value={scenarioFormData.slug}
                  onChange={(e) =>
                    setScenarioFormData({
                      ...scenarioFormData,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                    })
                  }
                  placeholder="Ex: biblioteca-db"
                />
                <span className="text-xs text-gray-400">
                  O slug será usado para buscar a imagem em /public/slug.png
                </span>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsScenarioModalOpen(false)}
                  className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded flex items-center disabled:opacity-70 cursor-pointer"
                >
                  {isSubmitting && <LoadingSpinner />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isQuestionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
            <h2 className="text-2xl font-bold mb-4">
              {questionFormData.id ? 'Editar Questão' : 'Nova Questão'}
            </h2>
            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Enunciado
                </label>
                <textarea
                  required
                  rows={3}
                  className="mt-1 block w-full border rounded p-2"
                  value={questionFormData.statement}
                  onChange={(e) =>
                    setQuestionFormData({
                      ...questionFormData,
                      statement: e.target.value,
                    })
                  }
                  placeholder="Ex: Liste o nome de todos os usuários..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Query Esperada (Gabarito)
                </label>
                <textarea
                  required
                  rows={4}
                  className="mt-1 block w-full border rounded p-2 font-mono text-sm bg-gray-50"
                  value={questionFormData.expected_query}
                  onChange={(e) =>
                    setQuestionFormData({
                      ...questionFormData,
                      expected_query: e.target.value,
                    })
                  }
                  placeholder="SELECT * FROM table;"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Nível de Dificuldade (1 a 100)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    className="mt-1 block w-full border rounded p-2"
                    value={questionFormData.difficulty}
                    onChange={(e) =>
                      setQuestionFormData({
                        ...questionFormData,
                        difficulty: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="flex-1 flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600"
                      checked={questionFormData.is_special}
                      onChange={(e) =>
                        setQuestionFormData({
                          ...questionFormData,
                          is_special: e.target.checked,
                        })
                      }
                    />
                    <span className="text-sm font-medium text-purple-700">
                      Questão Especial (Desafio)
                    </span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded flex items-center disabled:opacity-70 cursor-pointer"
                >
                  {isSubmitting && <LoadingSpinner />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
