import { TableDataWithTotal } from './Table';
import { AdaptiveState } from './models';

/**
 * Resultado da execução de uma consulta
 */
export interface QueryResult {
  data: TableDataWithTotal | null;
  error: string | null;
}

/**
 * Resposta da validação de uma consulta: se está correta, mensagens,
 * os resultados das consultas e (para alunos) o novo estado da trilha.
 */
export interface ValidateResponse {
  valid: boolean;
  message?: string | null;
  error?: string | null;
  statement?: string;
  result_table?: QueryResult | null;
  expected_table?: QueryResult | null;
  adaptive_state?: AdaptiveState;
}
