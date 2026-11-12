import { api } from '@/lib/api';
import type {
  Class,
  EnrollmentReport,
  Question,
  Scenario,
  Student,
} from '@/types/models';
import type {
  DetailedQuestionMetric,
  ProgressData,
  QuestionMetric,
} from '@/types/metrics';
import type { ValidateResponse } from '@/types/validate';

export interface QuestionPayload {
  scenario_database_id?: number;
  statement?: string;
  expected_query?: string;
  question_order?: number;
  difficulty?: number;
  is_special?: boolean;
}

/** Operações comuns a professores e administradores */
export const staffService = {
  // CENÁRIOS
  getAllScenarios: async (): Promise<Scenario[]> =>
    (await api.get('/scenarios')).data,
  createScenario: async (data: {
    name: string;
    slug: string;
    diagram_url?: string;
  }): Promise<Scenario> => (await api.post('/scenarios', data)).data,
  getScenarioBySlug: async (slug: string): Promise<Scenario> =>
    (await api.get(`/scenarios/${slug}`)).data,
  editScenario: async (
    slug: string,
    data: { name?: string; diagram_url?: string },
  ): Promise<Scenario> => (await api.put(`/scenarios/${slug}`, data)).data,
  deleteScenario: async (slug: string) =>
    (await api.delete(`/scenarios/${slug}`)).data,

  // QUESTÕES
  getAllQuestions: async (): Promise<Question[]> =>
    (await api.get('/questions')).data,
  getQuestionsByScenario: async (slug: string): Promise<Question[]> =>
    (await api.get(`/questions/${slug}`)).data,
  createQuestion: async (data: QuestionPayload): Promise<Question> =>
    (await api.post('/questions', data)).data,
  editQuestion: async (
    questionId: number,
    data: QuestionPayload,
  ): Promise<Question> =>
    (await api.put(`/questions/${questionId}`, data)).data,
  deleteQuestion: async (questionId: number) =>
    (await api.delete(`/questions/${questionId}`)).data,

  // TESTE DE GABARITOS
  validateTestingQuery: async (data: {
    question_id: number;
    testing_sql: string;
  }): Promise<ValidateResponse> =>
    (await api.post('/validate/testing', data)).data,

  // TURMAS
  editClass: async (
    classId: number,
    data: { class_name?: string; subject?: string; year_semester?: string },
  ) => (await api.put(`/classrooms/${classId}`, data)).data as Class,
  deleteClass: async (classId: number) =>
    (await api.delete(`/classrooms/${classId}`)).data,

  // MATRÍCULAS
  getStudentsInClass: async (classId: number): Promise<Student[]> =>
    (await api.get(`/classrooms/${classId}/students`)).data,
  enrollStudent: async (
    classId: number,
    data: { matricula: string; nome: string },
  ): Promise<EnrollmentReport> =>
    (await api.post(`/classrooms/${classId}/enroll`, data)).data,
  enrollStudentsBulk: async (
    classId: number,
    file: File,
  ): Promise<EnrollmentReport> => {
    const formData = new FormData();
    formData.append('file', file);
    return (
      await api.post(`/classrooms/${classId}/enroll/bulk`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).data;
  },
  removeEnrollment: async (classId: number, studentId: number) =>
    (await api.delete(`/classrooms/${classId}/unenroll/${studentId}`)).data,

  // ALUNOS
  getStudents: async (): Promise<Student[]> =>
    (await api.get('/auth/students')).data,
  editStudent: async (
    studentId: number,
    data: { name?: string; registration_number?: string; password?: string },
  ) => (await api.put(`/auth/student/${studentId}`, data)).data,
  regenerateAccessCode: async (
    studentId: number,
  ): Promise<{ access_code: string; student: Student }> =>
    (await api.post(`/auth/student/${studentId}/access-code`)).data,

  // MÉTRICAS & RELATÓRIOS
  getGlobalMetrics: async (params?: {
    scenario_id?: number;
    class_id?: number;
    year_semester?: string;
    question_id?: number;
  }): Promise<QuestionMetric[]> =>
    (await api.get('/reports/questions/metrics', { params })).data,
  getStudentProgress: async (
    studentId: number,
    params?: { scenario_id?: number },
  ): Promise<ProgressData> =>
    (await api.get(`/reports/students/${studentId}/progress`, { params })).data,
  getClassQuestionsDetail: async (
    classId: number,
  ): Promise<DetailedQuestionMetric[]> =>
    (await api.get(`/reports/classes/${classId}/questions/details`)).data,
};
