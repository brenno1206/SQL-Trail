export type TableCell = string | number | boolean | null | object;

/**
 * colunas e linhas da tabela resultante da consulta
 */
export interface TableData {
  columns: string[];
  rows: TableCell[][];
}

/**
 * Resultado da consulta com o total real de linhas
 * (as linhas exibidas podem ser limitadas pelo servidor; nesse caso `truncated` é true)
 */
export interface TableDataWithTotal extends TableData {
  total: number;
  truncated?: boolean;
}
