import { TableDataWithTotal } from './Table';

// --- Tipagem para as respostas da API ---

export interface QuestionListItem {
  id: number;
  slug: string;
  enunciado: string;
}

export interface QueryResult {
  data: TableDataWithTotal | null;
  error: string;
}

export interface ValidateResponse {
  valid: boolean;
  message?: string;
  error?: string;
  result_table?: QueryResult;
  expected_table?: QueryResult;
}
