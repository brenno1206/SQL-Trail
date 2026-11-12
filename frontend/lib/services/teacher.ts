import { api } from '@/lib/api';
import type { Class } from '@/types/models';
import { staffService } from './shared';

/** Serviços disponíveis para professores */
export const teacherService = {
  ...staffService,

  getMyClasses: async (): Promise<Class[]> =>
    (await api.get('/classrooms/my-classes/teacher')).data,

  createClass: async (data: {
    class_name: string;
    subject: string;
    year_semester: string;
  }): Promise<Class> => (await api.post('/classrooms/', data)).data,
};
