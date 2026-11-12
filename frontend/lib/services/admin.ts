import { api } from '@/lib/api';
import type { Admin, Class, Student, Teacher } from '@/types/models';
import { staffService } from './shared';

/** Serviços disponíveis para administradores */
export const AdminService = {
  ...staffService,

  // ADMINISTRADORES
  getAllAdmins: async (): Promise<Admin[]> =>
    (await api.get('/auth/admins')).data,
  createAdmin: async (data: {
    name: string;
    email: string;
    password: string;
  }) => (await api.post('/auth/admin', data)).data,
  editAdmin: async (
    adminId: number,
    data: { name?: string; email?: string; password?: string },
  ) => (await api.put(`/auth/admin/${adminId}`, data)).data,
  deleteAdmin: async (adminId: number) =>
    (await api.delete(`/auth/admin/${adminId}`)).data,

  // PROFESSORES
  getAllTeachers: async (): Promise<Teacher[]> =>
    (await api.get('/auth/teachers')).data,
  createTeacher: async (data: {
    name: string;
    email: string;
    registration_number: string;
    password: string;
  }) => (await api.post('/auth/teacher', data)).data,
  editTeacher: async (
    teacherId: number,
    data: {
      name?: string;
      email?: string;
      registration_number?: string;
      password?: string;
    },
  ) => (await api.put(`/auth/teacher/${teacherId}`, data)).data,
  deleteTeacher: async (teacherId: number) =>
    (await api.delete(`/auth/teacher/${teacherId}`)).data,

  // ALUNOS
  getAllStudents: async (): Promise<Student[]> =>
    (await api.get('/auth/students')).data,
  createStudent: async (data: {
    name: string;
    registration_number: string;
  }): Promise<{ student: Student; access_code: string }> =>
    (await api.post('/auth/student', data)).data,
  deleteStudent: async (studentId: number) =>
    (await api.delete(`/auth/student/${studentId}`)).data,

  // TURMAS
  getAllClasses: async (): Promise<Class[]> =>
    (await api.get('/classrooms/')).data,
  createClass: async (data: {
    class_name: string;
    subject: string;
    year_semester: string;
    teacher_id: number;
  }): Promise<Class> => (await api.post('/classrooms/', data)).data,
};
