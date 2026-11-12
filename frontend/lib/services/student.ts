import { api } from '@/lib/api';
import type { AdaptiveState, Question, Scenario } from '@/types/models';
import type { ProgressData } from '@/types/metrics';
import type { ValidateResponse } from '@/types/validate';

export const StudentService = {
  // CENÁRIOS & QUESTÕES (sem gabaritos)
  getAllScenarios: async (): Promise<Scenario[]> =>
    (await api.get('/scenarios')).data,
  getScenarioBySlug: async (slug: string): Promise<Scenario> =>
    (await api.get(`/scenarios/${slug}`)).data,
  getQuestionsByScenario: async (slug: string): Promise<Question[]> =>
    (await api.get(`/questions/${slug}`)).data,

  // TRILHA ADAPTATIVA (CAT)
  /** Busca a sessão ativa (ou cria uma nova) e devolve o estado da trilha */
  getAdaptiveState: async (slug: string): Promise<AdaptiveState> =>
    (await api.get(`/adaptive/${slug}/start-or-next`)).data,

  /** Recomeça a trilha do cenário (o histórico é mantido) */
  resetTrail: async (slug: string): Promise<AdaptiveState> =>
    (await api.post(`/adaptive/${slug}/reset`)).data,

  /**
   * Valida a consulta. A sessão e o tempo das questões da trilha são controlados pelo servidor;
   * `time_spent_seconds` só é usado no modo prática (tempo desde a última tentativa).
   */
  validateQuery: async (data: {
    question_id: number;
    student_sql: string;
    time_spent_seconds?: number;
  }): Promise<ValidateResponse> => (await api.post('/validate', data)).data,

  /** Pula a questão atual da trilha (liberado após o tempo mínimo) */
  skipQuestion: async (data: {
    question_id: number;
  }): Promise<ValidateResponse> =>
    (await api.post('/validate/skip', data)).data,

  // PROGRESSO
  getMetrics: async (scenarioId: number): Promise<ProgressData> =>
    (
      await api.get('/reports/me/progress', {
        params: { scenario_id: scenarioId },
      })
    ).data,
};
