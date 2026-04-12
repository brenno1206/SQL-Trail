import { api } from '@/lib/api';

export const teacherService = {
  // CLASSE CRUD
  getMyClasses: async () => {
    const response = await api.get('/classrooms/my-classes/teacher');
    return response.data;
  },

  getClass: async (classId: number) => {
    const response = await api.get(`/classrooms/${classId}`);
    return response.data;
  },

  createClass: async (classData: {
    class_name: string;
    subject: string;
    year_semester: string;
  }) => {
    const response = await api.post('/classrooms/', classData);
    return response.data;
  },

  editClass: async (
    classId: number,
    classData: {
      class_name?: string;
      subject?: string;
      year_semester?: string;
    },
  ) => {
    const response = await api.put(`/classrooms/${classId}`, classData);
    return response.data;
  },

  deleteClass: async (classId: number) => {
    const response = await api.delete(`/classrooms/${classId}`);
    return response.data;
  },

  // GERENCIAMENTO DE MATRÍCULAS
  getStudentsInClass: async (classId: number) => {
    const response = await api.get(`/classrooms/${classId}/students`);
    return response.data;
  },

  enrollStudent: async (
    classId: number,
    studentData: { matricula: string; nome: string },
  ) => {
    const response = await api.post(
      `/classrooms/${classId}/enroll`,
      studentData,
    );
    return response.data;
  },

  enrollStudentsBulk: async (classId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(
      `/classrooms/${classId}/enroll/bulk`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data;
  },

  removeEnrollment: async (classId: number, studentId: number) => {
    const response = await api.delete(
      `/classrooms/${classId}/unenroll/${studentId}`,
    );
    return response.data;
  },

  // CENÁRIO CRUD
  getAllScenarios: async () => {
    const response = await api.get('/scenarios');
    return response.data;
  },

  createScenario: async (scenarioData: {
    name: string;
    slug: string;
    diagram_url: string;
  }) => {
    const response = await api.post('/scenarios', scenarioData);
    return response.data;
  },

  getScenarioBySlug: async (slug: string) => {
    const response = await api.get(`/scenarios/${slug}`);
    return response.data;
  },

  editScenario: async (
    slug: string,
    scenarioData: {
      name?: string;
      slug?: string;
      diagram_url?: string;
    },
  ) => {
    const response = await api.put(`/scenarios/${slug}`, scenarioData);
    return response.data;
  },

  deleteScenario: async (slug: string) => {
    const response = await api.delete(`/scenarios/${slug}`);
    return response.data;
  },

  // QUESTÕES CRUD
  getAllQuestions: async () => {
    const response = await api.get('/questions');
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

  createQuestion: async (questionData: {
    scenario_database_id: number;
    statement: string;
    expected_query: string;
    question_number: number;
    is_special?: boolean;
  }) => {
    const response = await api.post('/questions', questionData);
    return response.data;
  },

  getQuestionById: async (questionId: number) => {
    const response = await api.get(`/questions/${questionId}`);
    return response.data;
  },

  editQuestion: async (
    questionId: number,
    questionData: {
      statement?: string;
      expected_query?: string;
      question_number?: number;
      is_special?: boolean;
    },
  ) => {
    const response = await api.put(`/questions/${questionId}`, questionData);
    return response.data;
  },

  deleteQuestion: async (questionId: number) => {
    const response = await api.delete(`/questions/${questionId}`);
    return response.data;
  },

  // TESTES DE VALIDAÇÃO
  validateTestingQuery: async (testingData: {
    slug: string;
    question_id: number;
    testing_sql: string;
  }) => {
    const response = await api.post('/validate/testing', testingData);
    return response.data;
  },

  // MÉTRICAS & RELATÓRIOS
  getGlobalMetrics: async (params?: {
    scenario_id?: number;
    class_id?: number;
    year_semester?: string;
    question_id?: number;
  }) => {
    const response = await api.get('/reports/questions/metrics', { params });
    return response.data;
  },

  getStudentProgress: async (
    studentId: number,
    params?: { scenario_id?: number },
  ) => {
    const response = await api.get(`/reports/students/${studentId}/progress`, {
      params,
    });
    return response.data;
  },

  getStudentQuestionEngagement: async (
    studentId: number,
    questionId: number,
  ) => {
    const response = await api.get(
      `/reports/students/${studentId}/questions/${questionId}/engagement`,
    );
    return response.data;
  },

  getClassQuestionsDetail: async (classId: number) => {
    const response = await api.get(
      `/reports/classes/${classId}/questions/details`,
    );
    return response.data;
  },
};
