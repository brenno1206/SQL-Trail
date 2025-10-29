import { TableDataWithTotal } from './Table';

// --- Tipagem para as respostas da API ---
export interface QuestionResponse {
  id: number;
  enunciado: string;
}

export interface ValidateResponse {
  message?: string;
  error?: string;
  result_table?: TableDataWithTotal;
  expected_table?: TableDataWithTotal;
}
