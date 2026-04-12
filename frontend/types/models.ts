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
}

export interface Question {
  id: number;
  question_number: number;
  is_special: boolean;
  scenario_database_id?: number;
  slug?: string;
  statement?: string;
  expected_query?: string;
}
// SubmissionsPerQuestion
export interface Submission {
  student_id: number;
  total_attempts: number;
  is_correct: boolean;
  correct_time_spent_seconds: number | null;
  correct_timestamp: string | null;
}
