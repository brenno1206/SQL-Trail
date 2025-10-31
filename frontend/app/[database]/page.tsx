'use client';

import { useState, useEffect, useCallback } from 'react';

import axios from 'axios';
import { Footer } from '@/components/Footer';
import { TableDataWithTotal } from '@/types/Table';
import { QuestionResponse, ValidateResponse } from '@/types/Response';
import Header from '@/components/Header';
import CodeArea from '@/components/CodeArea';
import { ResultCard } from '@/components/ResultCard';
import { MessageStatus } from '@/components/MessageStatus';

export default function Home() {
  const API_URL = 'http://127.0.0.1:5000';

  // --- Estado para o conteúdo do editor ---
  const [sqlQuery, setSqlQuery] = useState<string>('');
  // TODO: mudar para tupla de id e slug
  const [questionId, setQuestionId] = useState<number | null>(null);

  // --- Estados para controlar a UI ---
  const [enunciado, setEnunciado] = useState(
    'Clique em Nova Questão para carregar um enunciado...',
  );
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- Estados para os resultados (com tipo específico) ---
  const [alunoResult, setAlunoResult] = useState<TableDataWithTotal | null>(
    null,
  );
  const [baseResult, setBaseResult] = useState<TableDataWithTotal | null>(null);
  const [alunoFooter, setAlunoFooter] = useState('');
  const [baseFooter, setBaseFooter] = useState('');

  // --- Função para carregar uma nova questão ---
  const carregarQuestao = useCallback(async () => {
    setMessage('');
    setIsLoading(false);

    try {
      // TO DO: ajustar para carregar questão por slug + id
      const res = await axios.get<QuestionResponse>(`${API_URL}/question`);
      const { enunciado, id } = res.data;

      setEnunciado(enunciado);
      setQuestionId(id);
      setSqlQuery('');
      setAlunoResult(null);
      setBaseResult(null);
      setAlunoFooter('');
      setBaseFooter('');
    } catch (err: unknown) {
      let errorMessage = 'Erro ao carregar questão.';
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.error || err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setMessage(errorMessage);
    }
  }, []);

  // --- Função para validar a consulta ---
  const validarConsulta = useCallback(async () => {
    setIsLoading(true);
    setMessage('');
    setAlunoResult(null);
    setBaseResult(null);
    setAlunoFooter('');
    setBaseFooter('');

    // TO DO: enviar também o slug da questão
    const payload = { student_sql: sqlQuery, question_id: questionId };

    try {
      const res = await axios.post<ValidateResponse>(
        `${API_URL}/validate`,
        payload,
      );
      const json = res.data;

      setMessage(json.message || json.error || 'Consulta processada.');

      if (json.result_table) {
        setAlunoResult(json.result_table);
        setAlunoFooter(
          `Mostrando ${json.result_table.rows.length} de ${json.result_table.total_rows} linhas`,
        );
      }
      if (json.expected_table) {
        setBaseResult(json.expected_table);
        setBaseFooter(
          `Mostrando ${json.expected_table.rows.length} de ${json.expected_table.total_rows} linhas`,
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
  }, [sqlQuery, questionId]);

  // --- Efeito para carregar a 1ª questão na montagem ---
  // TODO: A primeira questão carregada deve ser a de id 1 + slug
  useEffect(() => {
    carregarQuestao();
  }, [carregarQuestao]);

  // --- Handler para mudança no editor ---
  const onEditorChange = useCallback((value: string) => {
    setSqlQuery(value);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      {/** TODO: Botao pra voltar pra pag inicial */}
      <Header carregarQuestao={carregarQuestao} />
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
