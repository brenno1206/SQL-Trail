/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
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
import { IoMdStopwatch } from '@/assets/icons';

const slugs = databases.map((db) => db.slug);

/**
 * Página principal do aluno para uma trilha específica,
 * É onde o aluno interage com as questões, visualiza o enunciado, insere a consulta SQL
 * e recebe feedback imediato sobre a validade da resposta,
 * além de comparar os resultados obtidos com os esperados.
 */
export default function Home() {
  const params = useParams();
  const slug = Array.isArray(params.slug)
    ? params.slug[0]
    : (params.slug as string);

  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);

  const [sqlQuery, setSqlQuery] = useState<string>('');

  const [questionId, setQuestionId] = useState<number | null>(null);
  const [questionquestion_number, setQuestionquestion_number] = useState<
    number | null
  >(null);

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);

  const [elapsedTime, setElapsedTime] = useState(0);

  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [skippedIds, setSkippedIds] = useState<number[]>([]);

  const [currentQuestionIsSpecial, setCurrentQuestionIsSpecial] =
    useState(false);
  const [isQuestionCompleted, setIsQuestionCompleted] = useState(false);

  const [statement, setStatement] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingQuestions, setIsFetchingQuestions] = useState(true);

  const [alunoResult, setAlunoResult] = useState<TableDataWithTotal | null>(
    null,
  );
  const [baseResult, setBaseResult] = useState<TableDataWithTotal | null>(null);
  const [alunoFooter, setAlunoFooter] = useState('');
  const [baseFooter, setBaseFooter] = useState('');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (questionId && !isLoading && !isQuestionCompleted) {
      timer = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [questionId, isLoading, isQuestionCompleted]);

  const fetchAllQuestions = useCallback(
    async (justProcessedId?: number, wasSkipped: boolean = false) => {
      if (!slug) return;

      setIsLoading(true);
      setIsFetchingQuestions(true);
      setIsQuestionCompleted(false);
      setMessage(`Carregando trilha "${slug}"...`);
      setLoadedSlug(slug);

      try {
        const [questions, progressSubmissions] = await Promise.all([
          StudentService.getQuestionsByScenario(slug),
          StudentService.getProgressSubmissions(slug),
        ]);

        const backendCompleted = progressSubmissions
          .filter((p: any) => p.student_sql !== 'SKIP')
          .map((p: any) => p.question_id);

        const backendSkipped = progressSubmissions
          .filter((p: any) => p.student_sql === 'SKIP')
          .map((p: any) => p.question_id);

        const currentCompleted = [...backendCompleted];
        const currentSkipped = [...backendSkipped];

        if (justProcessedId) {
          if (wasSkipped && !currentSkipped.includes(justProcessedId)) {
            currentSkipped.push(justProcessedId);
          } else if (
            !wasSkipped &&
            !currentCompleted.includes(justProcessedId)
          ) {
            currentCompleted.push(justProcessedId);
          }
        }

        setCompletedIds(currentCompleted);
        setSkippedIds(currentSkipped);

        const allProcessedIds = [...currentCompleted, ...currentSkipped];

        setAllQuestions(questions);

        const specials = questions.filter((q: any) => q.is_special);
        const normals = questions.filter((q: any) => !q.is_special);

        const uncompletedSpecials = specials
          .filter((q: any) => !allProcessedIds.includes(q.id))
          .sort((a: any, b: any) => a.question_number - b.question_number);

        const uncompletedNormals = normals
          .filter((q: any) => !allProcessedIds.includes(q.id))
          .sort((a: any, b: any) => a.question_number - b.question_number);

        let questionToSelect = null;

        if (uncompletedSpecials.length > 0) {
          questionToSelect = uncompletedSpecials[0];
        } else if (uncompletedNormals.length > 0) {
          questionToSelect = uncompletedNormals[0];
        }

        if (questionToSelect) {
          setStatement(questionToSelect.statement || '');
          setQuestionId(questionToSelect.id);
          setQuestionquestion_number(questionToSelect.question_number);
          setCurrentQuestionIsSpecial(questionToSelect.is_special);

          setSqlQuery('');
          setAlunoResult(null);
          setBaseResult(null);
          setAlunoFooter('');
          setBaseFooter('');
          setMessage('');
          setElapsedTime(0);
        } else {
          setStatement('Trilha concluída ou sem questões disponíveis.');
          setMessage('');
          setQuestionId(null);
        }
      } catch (err: any) {
        setMessage(err.message || 'Erro ao carregar dados da trilha.');
        setStatement('Erro ao carregar lista de questões.');
        setLoadedSlug(null);
      } finally {
        setIsLoading(false);
        setIsFetchingQuestions(false);
      }
    },
    [slug],
  );

  useEffect(() => {
    if (slug && slug !== loadedSlug) {
      fetchAllQuestions();
    }
  }, [slug, loadedSlug, fetchAllQuestions]);

  const handleQuestionSelect = useCallback(
    (id: number) => {
      const selectedQuestion = allQuestions.find((q) => q.id === id);

      if (selectedQuestion) {
        setStatement(selectedQuestion.statement || '');
        setQuestionId(selectedQuestion.id);
        setQuestionquestion_number(selectedQuestion.question_number);
        setCurrentQuestionIsSpecial(selectedQuestion.is_special);
        setSqlQuery('');
        setAlunoResult(null);
        setBaseResult(null);
        setAlunoFooter('');
        setBaseFooter('');
        setMessage('');
        setIsLoading(false);

        setIsQuestionCompleted(completedIds.includes(selectedQuestion.id));
        setElapsedTime(0);
      }
    },
    [allQuestions, completedIds],
  );

  const validarConsulta = useCallback(async () => {
    if (!questionId) return;

    setIsLoading(true);
    setMessage('');
    setIsQuestionCompleted(false);
    setAlunoResult(null);
    setBaseResult(null);
    setAlunoFooter('');
    setBaseFooter('');

    try {
      const json = await StudentService.validateQuery({
        slug,
        question_id: questionId,
        time_spent_seconds: elapsedTime,
        student_sql: sqlQuery,
      });

      setMessage(json.message || json.error || 'Consulta processada.');

      if (json.valid) {
        setIsQuestionCompleted(true);
        setCompletedIds((prev) => Array.from(new Set([...prev, questionId])));

        setSkippedIds((prev) => prev.filter((id) => id !== questionId));
      }

      if (json.result_table?.data) {
        setAlunoResult(json.result_table.data);
        setAlunoFooter(
          `Mostrando ${json.result_table.data.rows.length} de ${json.result_table.data.total_rows || json.result_table.data.total} linhas`,
        );
      }

      if (json.expected_table?.data) {
        setBaseResult(json.expected_table.data);
        setBaseFooter(
          `Mostrando ${json.expected_table.data.rows.length} de ${json.expected_table.data.total_rows || json.expected_table.data.total} linhas`,
        );
      }
    } catch (err: any) {
      setMessage(err.message || 'Erro desconhecido ao realizar validação.');
    } finally {
      setIsLoading(false);
    }
  }, [sqlQuery, questionId, slug, elapsedTime]);

  const handleSkip = async () => {
    if (!questionId) return;
    setIsLoading(true);
    try {
      await StudentService.skipQuestion(questionId);
      setMessage('Questão pulada. Carregando próxima...');
      await fetchAllQuestions(questionId, true);
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
              <p>
                A trilha solicitada não existe. Por favor, verifique o URL ou
                selecione uma trilha válida.
              </p>
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
          completedIds={completedIds}
          skippedIds={skippedIds}
          onQuestionSelect={handleQuestionSelect}
        />
        <main className="flex flex-1 flex-col gap-8 px-10 py-10 md:flex-row">
          <section className="flex flex-col space-y-4 md:w-1/2">
            <div
              id="statement"
              className="rounded-lg bg-white p-4 text-gray-800 shadow dark:bg-gray-800 dark:text-gray-100 min-h-[60px] flex items-center border border-gray-200 dark:border-gray-700 relative"
            >
              {currentQuestionIsSpecial && (
                <span className="absolute -top-3 left-4 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                  Questão Especial
                </span>
              )}
              {isFetchingQuestions ? (
                <div className="flex items-center text-gray-500 dark:text-gray-400 mt-2">
                  <LoadingSpinner />
                  <span className="ml-2">
                    Carregando enunciado da questão...
                  </span>
                </div>
              ) : (
                <div className="mt-2 w-full">
                  {questionquestion_number !== null && (
                    <b className="text-blue-700 dark:text-blue-400">{`Questão ${questionquestion_number}) `}</b>
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

              {elapsedTime >= 180 && !isQuestionCompleted && (
                <button
                  onClick={handleSkip}
                  className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-bold py-1.5 px-4 rounded shadow-sm transition-all cursor-pointer"
                >
                  Pular Questão (Desistir)
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

            {isQuestionCompleted && (
              <button
                onClick={() =>
                  fetchAllQuestions(questionId || undefined, false)
                }
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-lg shadow-lg transition-colors text-lg cursor-pointer"
              >
                Parabéns! Ir para a próxima questão.
              </button>
            )}

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
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
