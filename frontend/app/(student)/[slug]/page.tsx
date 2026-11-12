'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StudentService } from '@/lib/services/student';
import { getErrorMessage } from '@/lib/api';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import CodeArea from '@/components/CodeArea';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ResultCard } from '@/components/ResultCard';
import { MessageStatus } from '@/components/MessageStatus';
import LoadingSpinner from '@/components/LoadingSpinner';
import { TableDataWithTotal } from '@/types/Table';
import { AdaptiveState, Question, Scenario } from '@/types/models';
import { getDiagramUrl } from '@/types/databases';
import { IoMdStopwatch, IoMdCheckmarkCircleOutline } from '@/assets/icons';

type Tone = 'neutral' | 'success' | 'error';

/**
 * Tela de resolução da trilha de desafios de um cenário (Teste Adaptativo Computadorizado).
 * - Acerto: o aluno avança para uma questão de nível superior.
 * - Erro: o aluno recebe o feedback e pode tentar novamente.
 * - Pulo: liberado após 3 minutos na questão; leva a uma questão de nível inferior.
 * - Questões já vistas podem ser revisadas no modo prática, sem alterar a trilha.
 */
export default function TrailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = Array.isArray(params.slug)
    ? params.slug[0]
    : (params.slug as string);

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [adaptive, setAdaptive] = useState<AdaptiveState | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  const [sqlQuery, setSqlQuery] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<Tone>('neutral');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingNext, setPendingNext] = useState<{
    question: Question | null;
    finished: boolean;
  } | null>(null);
  const [skipReadyAt, setSkipReadyAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [alunoResult, setAlunoResult] = useState<TableDataWithTotal | null>(
    null,
  );
  const [baseResult, setBaseResult] = useState<TableDataWithTotal | null>(null);

  // Início da tentativa atual (para o tempo enviado no modo prática).
  const attemptStartRef = useRef(Date.now());

  const catQuestionId = adaptive?.current_question?.id ?? null;
  // Após acertar a questão da trilha, ela continua em exibição até o aluno avançar.
  const isPracticeMode =
    question !== null && question.id !== catQuestionId && !pendingNext;
  const isFinished = !!adaptive?.is_finished && !pendingNext && !isPracticeMode;

  // Cronômetro da questão em exibição
  useEffect(() => {
    if (!question || pendingNext) return;
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [question, pendingNext]);

  const applyAdaptive = useCallback((state: AdaptiveState) => {
    setAdaptive(state);
    setSkipReadyAt(
      state.can_skip && state.skip_available_in !== null
        ? Date.now() + state.skip_available_in * 1000
        : null,
    );
  }, []);

  const showQuestion = useCallback((q: Question | null) => {
    setQuestion(q);
    setSqlQuery('');
    setAlunoResult(null);
    setBaseResult(null);
    setMessage('');
    setTone('neutral');
    setElapsedTime(0);
    setPendingNext(null);
    attemptStartRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const load = async () => {
      setIsFetching(true);
      try {
        const scen = await StudentService.getScenarioBySlug(slug);
        const [questions, state] = await Promise.all([
          StudentService.getQuestionsByScenario(slug),
          StudentService.getAdaptiveState(slug),
        ]);
        if (cancelled) return;
        setScenario(scen);
        setAllQuestions(questions);
        applyAdaptive(state);
        showQuestion(state.is_finished ? null : state.current_question);
      } catch (err) {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } }).response
          ?.status;
        if (status === 404) setNotFound(true);
        else {
          setMessage(getErrorMessage(err, 'Erro ao carregar a trilha.'));
          setTone('error');
        }
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [slug, applyAdaptive, showQuestion]);

  const handleQuestionSelect = useCallback(
    (id: number) => {
      const selected = allQuestions.find((q) => q.id === id);
      if (selected) showQuestion(selected);
    },
    [allQuestions, showQuestion],
  );

  const returnToTrail = () => {
    showQuestion(adaptive?.current_question ?? null);
  };

  const validarConsulta = useCallback(async () => {
    if (!question || isLoading || pendingNext) return;
    if (!sqlQuery.trim()) {
      setMessage('Sua consulta está em branco.');
      setTone('error');
      return;
    }
    setIsLoading(true);
    setMessage('');
    setAlunoResult(null);
    setBaseResult(null);
    const practiceSeconds = Math.round(
      (Date.now() - attemptStartRef.current) / 1000,
    );
    try {
      const json = await StudentService.validateQuery({
        question_id: question.id,
        student_sql: sqlQuery,
        time_spent_seconds: practiceSeconds,
      });
      attemptStartRef.current = Date.now();
      setMessage(json.message || json.error || 'Consulta processada.');
      setTone(json.valid ? 'success' : 'error');
      setAlunoResult(json.result_table?.data ?? null);
      setBaseResult(json.expected_table?.data ?? null);

      const state = json.adaptive_state;
      if (state) {
        applyAdaptive(state);
        if (!state.is_practice && state.advanced) {
          // Acertou a questão da trilha: aguarda o aluno avançar.
          setPendingNext({
            question: state.next_question ?? null,
            finished: state.is_finished,
          });
        }
      }
    } catch (err) {
      setMessage(getErrorMessage(err, 'Erro ao validar a consulta.'));
      setTone('error');
    } finally {
      setIsLoading(false);
    }
  }, [question, isLoading, pendingNext, sqlQuery, applyAdaptive]);

  const handleSkip = async () => {
    if (!question || isLoading) return;
    setIsLoading(true);
    try {
      const json = await StudentService.skipQuestion({
        question_id: question.id,
      });
      const state = json.adaptive_state;
      if (state) {
        applyAdaptive(state);
        showQuestion(state.is_finished ? null : state.current_question);
        setMessage(state.cat_message || 'Questão pulada.');
      }
    } catch (err) {
      setMessage(getErrorMessage(err, 'Erro ao pular a questão.'));
      setTone('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdvance = () => {
    if (!pendingNext) return;
    if (pendingNext.finished) {
      showQuestion(null);
    } else {
      showQuestion(pendingNext.question);
    }
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        'Recomeçar a trilha deste banco de dados? Seu histórico de respostas será mantido.',
      )
    ) {
      return;
    }
    setIsLoading(true);
    try {
      const state = await StudentService.resetTrail(slug);
      applyAdaptive(state);
      showQuestion(state.current_question);
    } catch (err) {
      setMessage(getErrorMessage(err, 'Erro ao recomeçar a trilha.'));
      setTone('error');
    } finally {
      setIsLoading(false);
    }
  };

  const onEditorChange = useCallback((value: string) => setSqlQuery(value), []);

  const skipSecondsLeft =
    skipReadyAt === null
      ? null
      : Math.max(0, Math.ceil((skipReadyAt - now) / 1000));
  const showSkip =
    !isPracticeMode &&
    !pendingNext &&
    !!adaptive?.can_skip &&
    skipSecondsLeft !== null &&
    skipSecondsLeft <= 0;

  if (notFound) {
    return (
      <ProtectedRoute allowedRoles={['student']}>
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

  const questionLabel = question
    ? question.is_special
      ? `Desafio ${question.question_order}) `
      : `Questão ${question.question_order}) `
    : '';

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
        <Header
          slug={slug}
          title={scenario?.name}
          diagramUrl={scenario ? getDiagramUrl(scenario) : undefined}
          allQuestions={allQuestions}
          masteredUntil={adaptive?.mastered_until ?? 0}
          currentQuestionId={catQuestionId}
          skippedOrders={adaptive?.skipped_orders ?? []}
          solvedQuestionIds={adaptive?.solved_question_ids ?? []}
          onQuestionSelect={handleQuestionSelect}
        />

        {scenario && scenario.has_credentials === false && (
          <div className="bg-yellow-100 border-b border-yellow-300 text-yellow-900 text-sm px-10 py-2">
            O banco de dados deste cenário ainda não está configurado no
            servidor. Avise o professor.
          </div>
        )}

        {isFinished && !question ? (
          <main className="flex flex-1 items-center justify-center p-6">
            <div className="max-w-xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-10 text-center border border-gray-100 dark:border-gray-700">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6">
                <IoMdCheckmarkCircleOutline className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Trilha Concluída!
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-lg mb-6">
                Você chegou ao fim da trilha e alcançou o nível mais alto
                disponível no momento. Use &quot;Ver Progresso&quot; para
                revisar as questões.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Voltar ao Painel
                </button>
                <button
                  onClick={handleReset}
                  disabled={isLoading}
                  className="px-6 py-3 bg-white border border-blue-600 text-blue-700 hover:bg-blue-50 font-bold rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                >
                  Recomeçar Trilha
                </button>
              </div>
            </div>
          </main>
        ) : (
          <main className="flex flex-1 flex-col gap-8 px-10 py-10 md:flex-row">
            <section className="flex flex-col space-y-4 md:w-1/2">
              {isPracticeMode && (
                <div className="bg-orange-100 border border-orange-300 text-orange-800 p-4 rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <strong className="block text-sm uppercase mb-1">
                      Modo Prática Ativo
                    </strong>
                    <span className="text-sm">
                      Você está revisando uma questão. Seu progresso na trilha
                      não será alterado.
                    </span>
                  </div>
                  <button
                    onClick={returnToTrail}
                    className="shrink-0 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm text-sm cursor-pointer"
                  >
                    {adaptive?.is_finished ? 'Fechar' : 'Voltar à Trilha'}
                  </button>
                </div>
              )}

              <div className="rounded-lg bg-white p-4 text-gray-800 shadow dark:bg-gray-800 dark:text-gray-100 min-h-[60px] flex items-center border border-gray-200 dark:border-gray-700 relative">
                {question?.is_special && (
                  <span className="absolute -top-3 left-4 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    Desafio Especial
                  </span>
                )}
                {isFetching ? (
                  <div className="flex items-center text-gray-500 dark:text-gray-400 mt-2">
                    <LoadingSpinner />
                    <span className="ml-2">
                      Sincronizando Sessão Adaptativa...
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 w-full">
                    {question && (
                      <b className="text-blue-700 dark:text-blue-400">
                        {questionLabel}
                      </b>
                    )}
                    {question?.statement || 'Nenhuma questão disponível.'}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500 mb-2 mt-2 px-2 h-8">
                {question && (
                  <span className="inline-flex items-center gap-1 font-mono bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200">
                    <IoMdStopwatch className="text-gray-600" /> Tempo:{' '}
                    {Math.floor(elapsedTime / 60)}m {elapsedTime % 60}s
                  </span>
                )}
                {showSkip && (
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
                disabled={!question || isLoading || !!pendingNext}
              />
            </section>

            <section className="flex flex-col space-y-6 md:w-1/2">
              <MessageStatus
                isLoading={isLoading}
                message={message}
                tone={tone}
              />

              {pendingNext && (
                <button
                  onClick={handleAdvance}
                  className="w-full font-bold py-4 px-6 rounded-lg shadow-lg transition-colors text-lg cursor-pointer bg-green-500 hover:bg-green-600 text-white"
                >
                  {pendingNext.finished
                    ? 'Parabéns! Concluir a trilha'
                    : 'Parabéns! Ir para a próxima questão'}
                </button>
              )}

              <ResultCard
                placeholder="Resultado do Aluno"
                result={alunoResult}
              />
              <ResultCard
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
