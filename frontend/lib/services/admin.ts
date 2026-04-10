import { api } from '@/lib/api';

export const AdminService = {
  // ==========================
  // ADMIN CRUD
  // ==========================
  createAdmin: async (adminData: {
    name: string;
    email: string;
    password?: string;
  }) => {
    const response = await api.post('/auth/admin', adminData);
    return response.data;
  },

  editAdmin: async (
    adminId: number,
    adminData: {
      name?: string;
      email?: string;
      password?: string;
    },
  ) => {
    const response = await api.put(`/auth/admin/${adminId}`, adminData);
    return response.data;
  },

  deleteAdmin: async (adminId: number) => {
    const response = await api.delete(`/auth/admin/${adminId}`);
    return response.data;
  },

  getAdmin: async (adminId: number) => {
    const response = await api.get(`/auth/admin/${adminId}`);
    return response.data;
  },

  getAllAdmins: async () => {
    const response = await api.get('/auth/admins');
    return response.data;
  },

  // ==========================
  // TEACHER CRUD
  // ==========================
  getAllTeachers: async () => {
    const response = await api.get('/auth/teachers');
    return response.data;
  },

  createTeacher: async (teacherData: {
    registration_number: string;
    name: string;
    email: string;
    password?: string;
  }) => {
    const response = await api.post('/auth/teacher', teacherData);
    return response.data;
  },

  editTeacher: async (
    teacherId: number,
    teacherData: {
      registration_number?: string;
      name?: string;
      email?: string;
      password?: string;
    },
  ) => {
    const response = await api.put(`/auth/teacher/${teacherId}`, teacherData);
    return response.data;
  },

  deleteTeacher: async (teacherId: number) => {
    const response = await api.delete(`/auth/teacher/${teacherId}`);
    return response.data;
  },

  // ==========================
  // STUDENT CRUD
  // ==========================
  getAllStudents: async () => {
    const response = await api.get('/auth/students');
    return response.data;
  },

  createStudent: async (studentData: {
    registration_number: string;
    name: string;
  }) => {
    const response = await api.post('/auth/student', studentData);
    return response.data;
  },

  editStudent: async (
    studentId: number,
    studentData: {
      registration_number?: string;
      name?: string;
      password?: string;
    },
  ) => {
    const response = await api.put(`/auth/student/${studentId}`, studentData);
    return response.data;
  },

  deleteStudent: async (studentId: number) => {
    const response = await api.delete(`/auth/student/${studentId}`);
    return response.data;
  },

  // ==========================
  // CLASS CRUD
  // ==========================
  getAllClasses: async () => {
    const response = await api.get('/classrooms/');
    return response.data;
  },

  createClass: async (classData: {
    class_name: string;
    teacher_id: number;
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

  // ==========================
  // ENROLLMENT OPERATIONS
  // ==========================
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

  // ==========================
  // SCENARIO CRUD
  // ==========================
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

  // ==========================
  // QUESTION CRUD
  // ==========================
  getAllQuestions: async () => {
    const response = await api.get('/questions');
    return response.data;
  },

  createQuestion: async (questionData: {
    scenario_database_id: number;
    statement: string;
    expected_query: string;
    question_number: number;
    is_special: boolean;
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
      question_number: number;
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

  // ==========================
  // TESTING & VALIDATION
  // ==========================
  validateTestingQuery: async (testingData: {
    slug: string;
    question_id: number;
    testing_sql: string;
  }) => {
    const response = await api.post('/validate/testing', testingData);
    return response.data;
  },

  // ==========================
  // REPORTS & METRICS
  // ==========================
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
