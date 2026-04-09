import { Submission } from './models';

export interface DetailedQuestionMetric {
  question_id: number;
  metrics: {
    total_class_attempts: number;
    students_attempted_count: number;
    students_correct_count: number;
    accuracy_rate_percentage: number;
    avg_time_to_correct_seconds: number;
    avg_attempts_to_correct: number;
  };
  students: {
    correct_submissions: Submission[];
    still_trying: Submission[];
  };
}

export interface ProgressData {
  total_available_questions: number;
  total_solved_questions: number;
  completion_percentage: number;
  scenario_name?: string;
}

export interface QuestionMetric {
  question_id: number;
  total_attempts: number;
  correct_attempts: number;
  accuracy_percentage: number;
  avg_time_spent_seconds: number;
  avg_attempts_per_student: number;
  students_attempted: number;
  students_correct: number;
}
