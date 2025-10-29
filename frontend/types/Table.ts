export type TableCell = string | number | boolean | null;

export interface TableData {
  columns: string[];
  rows: TableCell[][];
}

export interface TableDataWithTotal extends TableData {
  total_rows: number;
}
