import { TableDataWithTotal } from './Table';

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
