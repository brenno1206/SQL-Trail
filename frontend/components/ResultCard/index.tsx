import { TableDataWithTotal } from '@/types/Table';
import { Table } from '../Table';

interface ResultCardProps {
  placeholder: string;
  result: TableDataWithTotal | null;
  footer: string;
}

/** Componente de cartão de resultado das queries */
export function ResultCard({ footer, placeholder, result }: ResultCardProps) {
  return (
    <main>
      <div className="rounded-lg p-4 shadow bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100">
        <h2 className="mb-3 text-xl font-semibold dark:text-gray-300 text-gray-700">
          {placeholder}
        </h2>
        <div
          className="max-h-60 overflow-auto rounded-md border border-gray-200"
          id="resultAluno"
        >
          <Table data={result} />
        </div>
        <div className="mt-2 text-sm text-gray-500" id="footerAluno">
          {footer}
        </div>
      </div>
    </main>
  );
}
