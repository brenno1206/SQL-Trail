import { TableDataWithTotal } from './Table';

/**
 * dados resultantes da consulta
 */
export interface QueryResult {
  data: TableDataWithTotal | null;
  error: string;
}

/**
 * dados resultantes da consulta
 * inica se está correta ou não
 * erros ou mensagens de validação
 * além dos dados das queries
 */
export interface ValidateResponse {
  valid: boolean;
  message?: string;
  error?: string;
  result_table?: QueryResult;
  expected_table?: QueryResult;
}
