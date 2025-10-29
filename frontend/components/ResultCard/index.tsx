import { TableDataWithTotal } from '@/types/Table';
import { Table } from '../Table';

interface ResultCardProps {
  placeholder: string;
  result: TableDataWithTotal | null;
  footer: string;
}

export function ResultCard({ footer, placeholder, result }: ResultCardProps) {
  return (
    <main>
      <div className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-3 text-xl font-semibold text-gray-800">
          {placeholder}
        </h2>
        <div
          className="max-h-60 overflow-auto rounded-md border border-gray-200"
          id="resultAluno"
        >
          <Table data={result} />
        </div>
        <div className="mt-2 text-sm text-gray-600" id="footerAluno">
          {footer}
        </div>
      </div>
    </main>
  );
}
