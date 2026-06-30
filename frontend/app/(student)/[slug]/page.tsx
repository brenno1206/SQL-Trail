/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StudentService } from '@/lib/services/student';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import CodeArea from '@/components/CodeArea';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ResultCard } from '@/components/ResultCard';
import { MessageStatus } from '@/components/MessageStatus';
import LoadingSpinner from '@/components/LoadingSpinner';
import { databases } from '@/types/databases';
import { TableDataWithTotal } from '@/types/Table';
import { Question } from '@/types/models';
import { IoMdStopwatch, IoMdCheckmarkCircleOutline } from '@/assets/icons';

const slugs = databases.map((db) => db.slug);

export default function Home() {
  const params = useParams();
  const router = useRouter();
  const slug = Array.isArray(params.slug)
    ? params.slug[0]
    : (params.slug as string);

  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);

  // Estados do CAT (Teste Adaptativo e Trilha)
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [masteredUntil, setMasteredUntil] = useState<number>(0);
  const [skippedOrders, setSkippedOrders] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [pendingNextQuestion, setPendingNextQuestion] =
    useState<Question | null>(null);
  const [lastAttemptWasValid, setLastAttemptWasValid] = useState(false);
  const [isAttemptFinished, setIsAttemptFinished] = useState(false);

  // Rastreia a questão "Real" do CAT para comparar se está no Modo Prática
  const [catActiveQuestionId, setCatActiveQuestionId] = useState<number | null>(
    null,
  );

  // Estados da Questão em Exibição (Pode ser a do CAT ou do Modo Prática)
  const [questionId, setQuestionId] = useState<number | null>(null);
  const [questionOrder, setQuestionOrder] = useState<number | null>(null);
  const [currentQuestionIsSpecial, setCurrentQuestionIsSpecial] =
    useState(false);
  const [statement, setStatement] = useState('');

  // Lista para o Header visual (Árvore)
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);

  // Estados do Editor e Feedback
  const [sqlQuery, setSqlQuery] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingQuestions, setIsFetchingQuestions] = useState(true);

  // Resultados das Tabelas
  const [alunoResult, setAlunoResult] = useState<TableDataWithTotal | null>(
    null,
  );
  const [baseResult, setBaseResult] = useState<TableDataWithTotal | null>(null);
  const [alunoFooter, setAlunoFooter] = useState('');
  const [baseFooter, setBaseFooter] = useState('');

  const isPracticeMode =
    questionId !== null &&
    catActiveQuestionId !== null &&
    questionId !== catActiveQuestionId;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (questionId && !isLoading && !isAttemptFinished && !isFinished) {
      timer = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [questionId, isLoading, isAttemptFinished, isFinished]);

  const applyQuestion = useCallback((q: Question) => {
    setStatement(q.statement || '');
    setQuestionId(q.id);
    setQuestionOrder(q.question_order);
    setCurrentQuestionIsSpecial(q.is_special);

    setSqlQuery('');
    setAlunoResult(null);
    setBaseResult(null);
    setAlunoFooter('');
    setBaseFooter('');
    setMessage('');
    setElapsedTime(0);

    setIsAttemptFinished(false);
    setPendingNextQuestion(null);
  }, []);

  const loadScenarioData = useCallback(async () => {
    if (!slug) return;

    setIsLoading(true);
    setIsFetchingQuestions(true);
    setMessage(`Carregando Trilha de Aprendizado "${slug}"...`);
    setLoadedSlug(slug);

    try {
      const [allQs, catState] = await Promise.all([
        StudentService.getQuestionsByScenario(slug),
        StudentService.getAdaptiveState(slug),
      ]);

      setAllQuestions(allQs);

      if (catState.session_id) {
        setSessionId(catState.session_id);

        // AQUI: Agora ele carrega as variáveis do backend assim que entra na tela
        setMasteredUntil(catState.mastered_until || 0);
        setSkippedOrders(catState.skipped_orders || []);
        setIsFinished(catState.is_finished || false);

        if (catState.current_question && !catState.is_finished) {
          setCatActiveQuestionId(catState.current_question.id);
          applyQuestion(catState.current_question);
        }
      } else {
        setStatement('Erro: Não foi possível iniciar a sessão adaptativa.');
        setMessage('');
      }
    } catch (err: any) {
      setMessage(err.message || 'Erro ao carregar dados da trilha.');
      setStatement('Erro de conexão com o servidor.');
      setLoadedSlug(null);
    } finally {
      setIsLoading(false);
      setIsFetchingQuestions(false);
    }
  }, [slug, applyQuestion]);

  useEffect(() => {
    if (slug && slug !== loadedSlug) {
      loadScenarioData();
    }
  }, [slug, loadedSlug, loadScenarioData]);

  const handleQuestionSelect = useCallback(
    (id: number) => {
      const selectedQuestion = allQuestions.find((q) => q.id === id);
      if (selectedQuestion) {
        applyQuestion(selectedQuestion);
      }
    },
    [allQuestions, applyQuestion],
  );

  const returnToAdaptivePath = () => {
    const catQuestion = allQuestions.find((q) => q.id === catActiveQuestionId);
    if (catQuestion) {
      applyQuestion(catQuestion);
    }
  };

  const validarConsulta = useCallback(async () => {
    if (!questionId || !sessionId) return;

    setIsLoading(true);
    setMessage('');
    setAlunoResult(null);
    setBaseResult(null);
    setAlunoFooter('');
    setBaseFooter('');

    try {
      const json = await StudentService.validateQuery({
        slug,
        question_id: questionId,
        session_id: sessionId,
        time_spent_seconds: elapsedTime,
        student_sql: sqlQuery,
      });

      setMessage(json.message || json.error || 'Consulta processada.');
      setLastAttemptWasValid(json.valid);

      if (json.result_table?.data) {
        setAlunoResult(json.result_table.data);
        setAlunoFooter(
          `Mostrando ${json.result_table.data.rows.length} linhas`,
        );
      }

      if (json.expected_table?.data) {
        setBaseResult(json.expected_table.data);
        setBaseFooter(
          `Mostrando ${json.expected_table.data.rows.length} linhas`,
        );
      }

      if (json.adaptive_state) {
        setMasteredUntil(json.adaptive_state.mastered_until);
        setSkippedOrders(json.adaptive_state.skipped_orders || []);
        setIsFinished(json.adaptive_state.is_finished);

        // Se acertou uma questão vermelha (lacuna) durante a prática, atualiza a árvore
        if (isPracticeMode) {
          return;
        }

        if (!json.adaptive_state.is_finished) {
          setCatActiveQuestionId(json.adaptive_state.next_question?.id || null);
          setPendingNextQuestion(json.adaptive_state.next_question);
          setIsAttemptFinished(true);
        }
      }
    } catch (err: any) {
      setMessage(err.message || 'Erro desconhecido ao realizar validação.');
    } finally {
      setIsLoading(false);
    }
  }, [sqlQuery, questionId, sessionId, slug, elapsedTime, isPracticeMode]);

  const handleSkip = async () => {
    if (!questionId || !sessionId || questionOrder === null) return;

    if (questionOrder === masteredUntil + 1) {
      setMessage(
        ' Esta já é a questão fundamental para o seu nível atual. Você precisa resolvê-la para avançar. Recomendamos revisar os conceitos básicos antes de prosseguir.',
      );
      return;
    }

    setIsLoading(true);
    try {
      const json = await StudentService.skipQuestion({
        question_id: questionId,
        session_id: sessionId,
      });

      if (json.adaptive_state) {
        setMasteredUntil(json.adaptive_state.mastered_until);
        setSkippedOrders(json.adaptive_state.skipped_orders || []);
        setIsFinished(json.adaptive_state.is_finished);

        if (json.adaptive_state.is_finished) {
          setMessage('Avaliação concluída.');
        } else {
          setMessage('Questão pulada. Carregando próxima etapa...');
          setCatActiveQuestionId(json.adaptive_state.next_question.id);
          applyQuestion(json.adaptive_state.next_question);
        }
      }
    } catch (err: any) {
      setMessage(
        `Erro ao pular questão. ${err.response?.data?.error || err.message}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onEditorChange = useCallback((value: string) => {
    setSqlQuery(value);
  }, []);

  if (!slug || !slugs.includes(slug)) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen flex-col bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-50">
          <Header slug={slug} />
          <main className="flex flex-1 items-center justify-center">
            <div className="m-10 rounded-lg bg-white p-20 shadow dark:bg-gray-800">
              <h1 className="mb-4 text-2xl font-bold text-gray-800 dark:text-gray-50">
                Trilha não encontrada
              </h1>
            </div>
          </main>
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
        <Header
          slug={slug}
          allQuestions={allQuestions}
          masteredUntil={masteredUntil}
          currentQuestionId={catActiveQuestionId} // A marcação azul fica fixa na questão real
          skippedOrders={skippedOrders}
          onQuestionSelect={handleQuestionSelect}
        />

        {isFinished ? (
          <main className="flex flex-1 items-center justify-center p-6">
            <div className="max-w-xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-10 text-center border border-gray-100 dark:border-gray-700">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6">
                <IoMdCheckmarkCircleOutline className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Trilha Concluída!
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-lg mb-6">
                Você chegou ao fim da trilha e completou os níveis mais altos
                disponíveis no momento.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95"
                >
                  Voltar ao Painel
                </button>
              </div>
            </div>
          </main>
        ) : (
          <main className="flex flex-1 flex-col gap-8 px-10 py-10 md:flex-row">
            <section className="flex flex-col space-y-4 md:w-1/2">
              {/* Banner de Modo Prática */}
              {isPracticeMode && (
                <div className="bg-orange-100 border border-orange-300 text-orange-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <strong className="block text-sm uppercase mb-1">
                      Modo Prática Ativo
                    </strong>
                    <span className="text-sm">
                      Você está revisando uma questão anterior. Seu progresso na
                      trilha não será alterado.
                    </span>
                  </div>
                  <button
                    onClick={returnToAdaptivePath}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm text-sm"
                  >
                    Voltar à Trilha
                  </button>
                </div>
              )}

              <div className="rounded-lg bg-white p-4 text-gray-800 shadow dark:bg-gray-800 dark:text-gray-100 min-h-[60px] flex items-center border border-gray-200 dark:border-gray-700 relative">
                {currentQuestionIsSpecial && (
                  <span className="absolute -top-3 left-4 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    Questão Especial
                  </span>
                )}
                {isFetchingQuestions ? (
                  <div className="flex items-center text-gray-500 dark:text-gray-400 mt-2">
                    <LoadingSpinner />
                    <span className="ml-2">
                      Sincronizando Sessão Adaptativa...
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 w-full">
                    {questionOrder !== null && (
                      <b className="text-blue-700 dark:text-blue-400">{`Nível ${questionOrder}) `}</b>
                    )}{' '}
                    {statement}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500 mb-2 mt-2 px-2 h-8">
                {questionId && (
                  <span className="inline-flex items-center gap-1 font-mono bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200">
                    <IoMdStopwatch className="text-gray-600" /> Tempo:{' '}
                    {Math.floor(elapsedTime / 60)}m {elapsedTime % 60}s
                  </span>
                )}

                {/* Esconde o botão de pular se for Modo Prática */}
                {elapsedTime >= 10 && !isAttemptFinished && !isPracticeMode && (
                  <button
                    onClick={handleSkip}
                    disabled={isLoading}
                    className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-bold py-1.5 px-4 rounded shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    Pular Questão
                  </button>
                )}
              </div>

              <CodeArea
                onEditorChange={onEditorChange}
                validarConsulta={validarConsulta}
                sqlQuery={sqlQuery}
              />
            </section>

            <section className="flex flex-col space-y-6 md:w-1/2">
              <MessageStatus isLoading={isLoading} message={message} />

              {/* Botão de Avanço Dinâmico (Trilha Normal) */}
              {isAttemptFinished && pendingNextQuestion && !isPracticeMode && (
                <button
                  onClick={() => applyQuestion(pendingNextQuestion)}
                  className={`w-full font-bold py-4 px-6 rounded-lg shadow-lg transition-colors text-lg cursor-pointer ${
                    lastAttemptWasValid
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {lastAttemptWasValid
                    ? 'Resposta Correta! Avançar Trilha'
                    : 'Avançar Trilha de Aprendizado'}
                </button>
              )}

              {/* Tabelas de Resultados */}
              <ResultCard
                footer={alunoFooter}
                placeholder="Resultado do Aluno"
                result={alunoResult}
              />
              <ResultCard
                footer={baseFooter}
                placeholder="Resultado Esperado"
                result={baseResult}
              />
            </section>
          </main>
        )}
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
