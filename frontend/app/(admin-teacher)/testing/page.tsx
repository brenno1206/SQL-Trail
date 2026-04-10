/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import ProtectedRoute from '@/components/ProtectedRoute';
import CodeArea from '@/components/CodeArea';
import { ResultCard } from '@/components/ResultCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { LuTestTubeDiagonal } from '@/assets/icons';
import { AdminService } from '@/lib/services/admin';
import { teacherService } from '@/lib/services/teacher';
import { useAuth } from '@/contexts/AuthContext';
import { Question, Scenario } from '@/types/models';

export default function TestingValidatorPage() {
  // Pega o usuário logado para descobrir o role
  const { user } = useAuth();

  // Define dinamicamente o serviço com base no cargo.
  // O fallback para teacherService previne erros enquanto o AuthContext carrega.
  const apiService = user?.role === 'admin' ? AdminService : teacherService;

  // --- Estados de Dados ---
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // --- Estados de Seleção ---
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | ''>('');
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | ''>('');
  const [sqlQuery, setSqlQuery] = useState<string>('');

  // --- Estados de Execução e Resultado ---
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>(
    'info',
  );

  const [testingResult, setTestingResult] = useState<any>(null);
  const [baseResult, setBaseResult] = useState<any>(null);
  const [testingFooter, setTestingFooter] = useState('');
  const [baseFooter, setBaseFooter] = useState('');

  // --- Carregamento Inicial ---
  useEffect(() => {
    // Só tenta carregar se tivermos um usuário (evita chamadas duplas no mount)
    if (!user) return;

    const loadData = async () => {
      setLoadingInitial(true);
      try {
        const [scenariosData, questionsData] = await Promise.all([
          apiService.getAllScenarios(),
          apiService.getAllQuestions(),
        ]);
        setScenarios(scenariosData);
        setQuestions(questionsData);
      } catch (error: any) {
        setMessage(
          'Erro ao carregar cenários e questões. ' + (error.message || ''),
        );
        setMessageType('error');
      } finally {
        setLoadingInitial(false);
      }
    };
    loadData();
  }, [user, apiService]); // Adiciona dependências corretas

  // --- Filtros Derivados ---
  const filteredQuestions = questions
    .filter((q) => q.scenario_database_id === Number(selectedScenarioId))
    .sort((a, b) => a.question_number - b.question_number);

  const selectedQuestion = questions.find(
    (q) => q.id === Number(selectedQuestionId),
  );
  const selectedScenario = scenarios.find(
    (s) => s.id === Number(selectedScenarioId),
  );

  // Limpa a seleção de questão quando o cenário muda
  useEffect(() => {
    setSelectedQuestionId('');
    setSqlQuery('');
    resetResults();
  }, [selectedScenarioId]);

  // Limpa os resultados e preenche a query com a expected_query para facilitar o teste
  useEffect(() => {
    resetResults();
    if (selectedQuestion) {
      setSqlQuery(selectedQuestion.expected_query || '');
    } else {
      setSqlQuery('');
    }
  }, [selectedQuestionId, selectedQuestion]);

  const resetResults = () => {
    setTestingResult(null);
    setBaseResult(null);
    setTestingFooter('');
    setBaseFooter('');
    setMessage('');
  };

  const handleTestQuery = async () => {
    if (!selectedScenario || !selectedQuestion) {
      setMessage('Selecione um cenário e uma questão primeiro.');
      setMessageType('error');
      return;
    }

    if (!sqlQuery.trim()) {
      setMessage('A sua consulta SQL está vazia.');
      setMessageType('error');
      return;
    }

    setIsTesting(true);
    resetResults();
    setMessageType('info');
    setMessage('Validando consulta...');

    try {
      // Chama o método dinamicamente (admin ou teacher)
      const response = await apiService.validateTestingQuery({
        slug: selectedScenario.slug || '',
        question_id: selectedQuestion.id,
        testing_sql: sqlQuery,
      });

      if (response.valid) {
        setMessage(
          response.message || 'Consulta válida e idêntica ao gabarito! ✅',
        );
        setMessageType('success');
      } else {
        setMessage(response.error || 'A consulta não bate com o gabarito. ❌');
        setMessageType('error');
      }

      if (response.result_table?.data) {
        setTestingResult(response.result_table.data);
        setTestingFooter(
          `Retornou ${response.result_table.data.rows?.length || 0} de ${response.result_table.data.total_rows || 0} linhas.`,
        );
      } else if (response.result_table?.error) {
        setTestingFooter(`Erro SQL: ${response.result_table.error}`);
      }

      if (response.expected_table?.data) {
        setBaseResult(response.expected_table.data);
        setBaseFooter(
          `Retornou ${response.expected_table.data.rows?.length || 0} de ${response.expected_table.data.total_rows || 0} linhas.`,
        );
      } else if (response.expected_table?.error) {
        setBaseFooter(`Erro no Gabarito: ${response.expected_table.error}`);
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error ||
        error.message ||
        'Erro ao comunicar com a API.';
      setMessage(`Erro na validação: ${errorMsg}`);
      setMessageType('error');
    } finally {
      setIsTesting(false);
    }
  };

  // Retorna null ou um loading visual para não quebrar a tela enquanto o ProtectedRoute verifica a sessão
  if (!user) {
    return null;
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'teacher']}>
      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
        <Header />

        <main className="flex flex-1 flex-col gap-6 px-6 py-8 md:px-10 md:flex-row max-w-[1600px] mx-auto w-full">
          {/* LADO ESQUERDO: Controles e Editor */}
          <section className="flex flex-col space-y-4 md:w-1/2">
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <LuTestTubeDiagonal className="text-green-700" /> Ferramenta de
                Teste de Queries
              </h2>

              {loadingInitial ? (
                <div className="flex items-center text-gray-500 py-4">
                  <LoadingSpinner />{' '}
                  <span className="ml-2">Carregando dados...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Select do Scenario */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Cenário (Database)
                    </label>
                    <select
                      className="w-full border rounded-md p-2 bg-gray-50 text-gray-800 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                      value={selectedScenarioId}
                      onChange={(e) =>
                        setSelectedScenarioId(
                          e.target.value ? Number(e.target.value) : '',
                        )
                      }
                    >
                      <option value="">-- Selecione um cenário --</option>
                      {scenarios.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.slug})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select da Questão */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Questão
                    </label>
                    <select
                      className="w-full border rounded-md p-2 bg-gray-50 text-gray-800 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 disabled:opacity-50"
                      value={selectedQuestionId}
                      onChange={(e) =>
                        setSelectedQuestionId(
                          e.target.value ? Number(e.target.value) : '',
                        )
                      }
                      disabled={
                        !selectedScenarioId || filteredQuestions.length === 0
                      }
                    >
                      <option value="">-- Selecione uma questão --</option>
                      {filteredQuestions.map((q) => (
                        <option key={q.id} value={q.id}>
                          Questão {q.question_number}{' '}
                          {q.is_special ? '(Especial)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Display do Enunciado */}
              {selectedQuestion && (
                <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-md dark:bg-gray-700 dark:border-blue-400">
                  <p className="text-sm text-gray-800 dark:text-gray-100">
                    <span className="font-bold">Enunciado:</span>{' '}
                    {selectedQuestion.statement}
                  </p>
                </div>
              )}
            </div>

            {/* Editor de SQL */}
            <div className="flex-1 min-h-[300px]">
              <div className="mb-2 flex justify-between items-center px-1">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Query de Teste:
                </span>
                <button
                  onClick={handleTestQuery}
                  disabled={
                    isTesting || !selectedQuestionId || !sqlQuery.trim()
                  }
                  className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {isTesting && <LoadingSpinner />} Executar Teste
                </button>
              </div>
              <CodeArea
                onEditorChange={(val) => setSqlQuery(val)}
                validarConsulta={handleTestQuery}
                sqlQuery={sqlQuery}
              />
            </div>
          </section>

          {/* LADO DIREITO: Resultados */}
          <section className="flex flex-col space-y-6 md:w-1/2">
            <div
              className={`p-4 rounded-lg shadow-sm border font-medium ${
                messageType === 'success'
                  ? 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300'
                  : messageType === 'error'
                    ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300'
                    : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300'
              }`}
            >
              {message || 'Aguardando execução...'}
            </div>

            <ResultCard
              footer={testingFooter}
              placeholder="Resultado do seu Teste"
              result={testingResult}
            />

            <ResultCard
              footer={baseFooter}
              placeholder="Resultado do Gabarito (Expected)"
              result={baseResult}
            />
          </section>
        </main>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
