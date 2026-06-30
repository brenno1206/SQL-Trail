/**
 * Define os tipos de dados com base nos modelos do banco de dados
 */

export interface Student {
  id: number;
  name: string;
  registration_number: string;
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
  slug?: string;
  diagram_url?: string;
}

export interface Question {
  id: number;
  scenario_database_id?: number;
  statement?: string;
  expected_query?: string;
  question_order: number;
  difficulty: number;
  is_special: boolean;
}

export interface AdaptiveState {
  is_finished: boolean;
  next_question: Question | null;
  mastered_until: number;
  skipped_orders: number[];
  cat_message: string;
}

export interface Submission {
  student_id: number;
  total_attempts: number;
  is_correct: boolean;
  correct_time_spent_seconds: number | null;
  correct_timestamp: string | null;
}
