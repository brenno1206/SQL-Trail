'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Footer } from '@/components/Footer';
import { TableDataWithTotal } from '@/types/Table';
import { ValidateResponse, QuestionListItem } from '@/types/Response';
import Header from '@/components/Header';
import CodeArea from '@/components/CodeArea';
import { ResultCard } from '@/components/ResultCard';
import { MessageStatus } from '@/components/MessageStatus';
import { useParams } from 'next/navigation';

export default function Home() {
  const params = useParams();

  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);

  const slug = Array.isArray(params.slug)
    ? params.slug[0]
    : (params.slug as string);
  const API_URL = 'http://127.0.0.1:5000';

  // --- Estado para o conteúdo do editor ---
  const [sqlQuery, setSqlQuery] = useState<string>('');

  // --- Estados para Questões ---
  const [questionId, setQuestionId] = useState<number | null>(null);
  const [availableQuestions, setAvailableQuestions] = useState<
    QuestionListItem[]
  >([]);

  // --- Estados para controlar a UI ---
  const [enunciado, setEnunciado] = useState(
    'Clique em Nova Questão para carregar um enunciado...',
  );
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- Estados para os resultados das queries ---
  const [alunoResult, setAlunoResult] = useState<TableDataWithTotal | null>(
    null,
  );
  const [baseResult, setBaseResult] = useState<TableDataWithTotal | null>(null);
  const [alunoFooter, setAlunoFooter] = useState('');
  const [baseFooter, setBaseFooter] = useState('');

  // --- Função para selecionar questão ---

  const handleQuestionSelect = useCallback(
    (id: number) => {
      const selectedQuestion = availableQuestions.find((q) => q.id === id);

      if (selectedQuestion) {
        setEnunciado(selectedQuestion.enunciado);
        setQuestionId(selectedQuestion.id);

        setSqlQuery('');
        setAlunoResult(null);
        setBaseResult(null);
        setAlunoFooter('');
        setBaseFooter('');
        setMessage('');
        setIsLoading(false);
      } else {
        setMessage('Erro: A questão selecionada não foi encontrada.');
      }
    },
    [availableQuestions],
  );

  // --- Função para carregar todas as  Questões quando a página iniciar ---
  useEffect(() => {
    const fetchAllQuestions = async () => {
      if (!slug) return;

      setIsLoading(true);
      setMessage(`Carregando trilha "${slug}"...`);

      setLoadedSlug(slug);

      try {
        const res = await axios.get<QuestionListItem[]>(
          `${API_URL}/questions`,
          { params: { slug } },
        );

        const questions = res.data;
        if (questions && questions.length > 0) {
          setAvailableQuestions(questions);
          const firstQuestion = questions[0];
          setEnunciado(firstQuestion.enunciado);
          setQuestionId(firstQuestion.id);
          setSqlQuery('');
          setAlunoResult(null);
          setBaseResult(null);
          setAlunoFooter('');
          setBaseFooter('');
          setMessage('');
          setMessage(
            `Trilha "${slug}" carregada com ${questions.length} questões.`,
          );
        } else {
          setMessage('Nenhuma questão encontrada para esta trilha.');
          setAvailableQuestions([]);
          setEnunciado('Nenhuma questão encontrada.');
        }
      } catch (err: unknown) {
        let errorMessage = 'Erro ao carregar lista de questões.';
        if (axios.isAxiosError(err)) {
          errorMessage = err.response?.data?.error || err.message;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        setMessage(errorMessage);
        setEnunciado(errorMessage);
        setLoadedSlug(null);
      } finally {
        setIsLoading(false);
      }
    };
    if (slug && slug !== loadedSlug) {
      fetchAllQuestions();
    }
  }, [slug, loadedSlug]);

  // --- Função para validar a consulta ---
  const validarConsulta = useCallback(async () => {
    setIsLoading(true);
    setMessage('');
    setAlunoResult(null);
    setBaseResult(null);
    setAlunoFooter('');
    setBaseFooter('');

    // TO DO: enviar também o slug da questão
    const payload = {
      student_sql: sqlQuery,
      question_id: questionId,
      slug: slug,
    };

    try {
      const res = await axios.post<ValidateResponse>(
        `${API_URL}/validate`,
        payload,
      );
      const json = res.data;

      setMessage(json.message || json.error || 'Consulta processada.');

      if (json.result_table?.data) {
        setAlunoResult(json.result_table.data);
        setAlunoFooter(
          `Mostrando ${json.result_table.data.rows.length} de ${json.result_table.data.total_rows} linhas`,
        );
      }
      if (json.expected_table) {
        setBaseResult(json.expected_table.data || null);
        setBaseFooter(
          `Mostrando ${json.expected_table?.data?.rows.length} de ${json.expected_table?.data?.total_rows} linhas`,
        );
      }
    } catch (err: unknown) {
      let errorMessage = 'Erro desconhecido ao realizar validação.';
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.error || err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [sqlQuery, questionId, slug]);

  // --- Handler para mudança no editor ---
  const onEditorChange = useCallback((value: string) => {
    setSqlQuery(value);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <Header
        slug={slug}
        availableQuestions={availableQuestions}
        onQuestionSelect={handleQuestionSelect}
      />
      <main className="flex flex-1 flex-col gap-8 px-10 py-10 md:flex-row">
        <section className="flex flex-col space-y-4 md:w-1/2">
          <div id="enunciado" className="rounded-lg bg-white p-4 shadow">
            {enunciado}
          </div>
          <CodeArea
            onEditorChange={onEditorChange}
            validarConsulta={validarConsulta}
            sqlQuery={sqlQuery}
          />
        </section>

        <section className="flex flex-col space-y-6 md:w-1/2">
          <MessageStatus isLoading={isLoading} message={message} />

          <ResultCard
            footer={alunoFooter}
            placeholder={'Resultado do Aluno'}
            result={alunoResult}
          />
          <ResultCard
            footer={baseFooter}
            placeholder={'Resultado Esperado'}
            result={baseResult}
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}
