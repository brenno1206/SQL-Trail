/**
 * Tipos de dados com base nos modelos e respostas da API
 */
export type Role = 'student' | 'teacher' | 'admin';

export interface Student {
  id: number;
  name: string;
  registration_number: string;
  first_access_pending?: boolean;
}

export interface Admin {
  id: number;
  name: string;
  email: string;
}

export interface Teacher {
  id: number;
  name: string;
  email?: string;
  registration_number?: string;
}

export interface Class {
  id: number;
  teacher_id?: number;
  class_name: string;
  subject?: string;
  year_semester: string;
}

export interface Scenario {
  id: number;
  name: string;
  slug: string;
  diagram_url?: string;
  /** Indica se o servidor possui as credenciais do Supabase deste cenário */
  has_credentials?: boolean;
  /** Quantidade de questões na trilha adaptativa */
  question_count?: number;
}

/** Nível de dificuldade: 1 = Fácil, 2 = Médio, 3 = Difícil */
export type Difficulty = 1 | 2 | 3;

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Fácil',
  2: 'Médio',
  3: 'Difícil',
};

export interface Question {
  id: number;
  scenario_database_id?: number;
  statement?: string;
  /** Gabarito: enviado apenas para professores e administradores */
  expected_query?: string;
  question_order: number;
  difficulty: number;
  is_special: boolean;
}

/** Estado da trilha adaptativa (CAT) retornado pelo backend */
export interface AdaptiveState {
  session_id: number;
  is_finished: boolean;
  trail_size: number;
  mastered_until: number;
  current_question: Question | null;
  next_question?: Question | null;
  solved_question_ids: number[];
  skipped_orders: number[];
  can_skip: boolean;
  skip_available_in: number | null;
  skip_min_seconds: number;
  advanced?: boolean;
  is_practice?: boolean;
  cat_message?: string;
}

/** Aluno criado com código de primeiro acesso */
export interface CreatedStudentCode {
  registration_number: string;
  name: string;
  access_code: string;
}

/** Resultado de uma matrícula (individual ou em lote) */
export interface EnrollmentReport {
  msg?: string;
  message?: string;
  created: CreatedStudentCode[];
  warnings: string[];
  enrolled: number;
  already_enrolled: number;
}
