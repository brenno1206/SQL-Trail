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
};
