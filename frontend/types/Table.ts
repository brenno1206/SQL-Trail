export type TableCell = string | number | boolean | null;

/**
 * colunas e linhas da tabela resultante da consulta
 */
export interface TableData {
  columns: string[];
  rows: TableCell[][];
}

/**
 * total de linhas da consulta, mesmo que a tabela resultante seja limitada por paginação
 */
export interface TableDataWithTotal extends TableData {
  total_rows: number;
}
