import { api } from '@/lib/api';

export const StudentService = {
  // =========================================================================
  // CENÁRIOS & BUSCAS GERAIS
  // =========================================================================

  getAllScenarios: async () => {
    const response = await api.get('/scenarios');
    return response.data;
  },

  getScenarioBySlug: async (slug: string) => {
    const response = await api.get(`/scenarios/${slug}`);
    return response.data;
  },

  getQuestionsByScenario: async (slug: string) => {
    const response = await api.get(`/questions/${slug}`);
    return response.data;
  },

  getSpecialQuestions: async (slug: string) => {
    const response = await api.get(`/questions/${slug}/special`);
    return response.data;
  },

  getNotSpecialQuestions: async (slug: string) => {
    const response = await api.get(`/questions/${slug}/not-special`);
    return response.data;
  },

  checkSpecialCompletion: async (slug: string) => {
    const response = await api.get(`/scenarios/${slug}/special-completed`);
    return response.data;
  },

  // =========================================================================
  // FLUXO DO TESTE ADAPTATIVO (CAT)
  // =========================================================================

  getAdaptiveState: async (slug: string) => {
    // Busca a sessão ativa ou cria uma nova e devolve a questão exata
    const response = await api.get(`/adaptive/${slug}/start-or-next`);
    return response.data;
  },

  validateQuery: async (validationData: {
    slug: string;
    question_id: number;
    session_id: number; // Obrigatório para a busca binária
    time_spent_seconds?: number;
    student_sql: string;
  }) => {
    const response = await api.post('/validate', validationData);
    // Agora essa resposta também trará o objeto 'adaptive_state'
    return response.data;
  },

  skipQuestion: async (skipData: {
    question_id: number;
    session_id: number; // Obrigatório para registrar o pulo como limite de falha
  }) => {
    const response = await api.post('/validate/skip', skipData);
    // Também devolve o novo 'adaptive_state' com a questão mais fácil
    return response.data;
  },

  // =========================================================================
  // RELATÓRIOS & PROGRESSO
  // =========================================================================

  getMetrics: async (slug: string) => {
    const scenario = await StudentService.getScenarioBySlug(slug);
    const response = await api.get(
      `/reports/me/progress?scenario_id=${scenario.id}`,
    );
    return response.data;
  },

  getProgressIds: async (slug: string) => {
    const scenario = await StudentService.getScenarioBySlug(slug);
    const response = await api.get(
      `/reports/me/submissions/correct/latest?scenario_id=${scenario.id}`,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return response.data.map((sub: any) => sub.question_id);
  },

  getProgressSubmissions: async (slug: string) => {
    const response = await api.get(`/reports/${slug}/progress-submissions`);
    return response.data;
  },
};
