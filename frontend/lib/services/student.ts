import { api } from '@/lib/api';

export const StudentService = {
  // ==========================
  // SCENARIOS
  // ==========================
  getAllScenarios: async () => {
    const response = await api.get('/scenarios');
    return response.data;
  },

  getScenarioBySlug: async (slug: string) => {
    const response = await api.get(`/scenarios/${slug}`);
    return response.data;
  },

  checkSpecialCompletion: async (slug: string) => {
    const response = await api.get(`/scenarios/${slug}/special-completed`);
    return response.data;
  },

  // ==========================
  // QUESTIONS
  // ==========================
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

  // ==========================
  // VALIDATION & SUBMISSION
  // ==========================
  validateQuery: async (validationData: {
    slug: string;
    question_id: number;
    time_spent_seconds?: number;
    student_sql: string;
  }) => {
    const response = await api.post('/validate', validationData);
    return response.data;
  },

  skipQuestion: async (question_id: number) => {
    const response = await api.post('/validate/skip', { question_id });
    return response.data;
  },

  // ==========================
  // METRICS & PROGRESS
  // ==========================
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
