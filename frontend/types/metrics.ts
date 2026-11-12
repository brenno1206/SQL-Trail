/**
 * Dados de um aluno em uma questão, no detalhamento por turma
 */
export interface StudentQuestionDetail {
  student_id: number;
  student_name: string;
  total_attempts: number;
  attempts_until_correct: number | null;
  skips: number;
  is_correct: boolean;
  correct_time_spent_seconds: number | null;
  correct_timestamp: string | null;
}

/**
 * Métricas detalhadas de uma questão específica por turma
 */
export interface DetailedQuestionMetric {
  question_id: number;
  metrics: {
    total_class_attempts: number;
    students_attempted_count: number;
    students_correct_count: number;
    /** Alunos que acertaram / alunos que tentaram */
    accuracy_rate_percentage: number;
    avg_time_to_correct_seconds: number;
    avg_attempts_to_correct: number;
  };
  students: {
    correct_submissions: StudentQuestionDetail[];
    still_trying: StudentQuestionDetail[];
  };
}

/**
 * Progresso do aluno (geral ou por cenário)
 */
export interface ProgressData {
  /** Questões da trilha adaptativa */
  trail_size: number;
  /** Nível dominado na trilha (busca binária) */
  mastered_until: number;
  /** Progresso na trilha: mastered_until / trail_size */
  completion_percentage: number;
  total_available_questions: number;
  total_solved_questions: number;
  solved_percentage: number;
  total_time_seconds: number;
  scenario_name?: string;
}

/**
 * Métricas agregadas de uma questão
 */
export interface QuestionMetric {
  question_id: number;
  total_attempts: number;
  correct_attempts: number;
  skips: number;
  /** Alunos que acertaram / alunos que tentaram */
  accuracy_percentage: number;
  /** Tentativas corretas / tentativas */
  attempt_accuracy_percentage: number;
  avg_time_spent_seconds: number;
  avg_attempts_per_student: number;
  students_attempted: number;
  students_correct: number;
}
