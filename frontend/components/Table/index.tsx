import { TableData } from '@/types/Table';

export function Table({ data }: { data: TableData | null }) {
  if (!data || data.rows.length === 0) {
    return (
      <p className="p-4 text-center text-zinc-500">
        Nenhum resultado para exibir.
      </p>
    );
  }

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-gray-100">
          {data.columns.map((col) => (
            <th
              key={col}
              className="border border-gray-300 p-2 text-left font-medium text-gray-700"
            >
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="odd:bg-white even:bg-gray-50">
            {row.map((cell, cellIndex) => (
              <td
                key={`${rowIndex}-${cellIndex}`}
                className="border border-gray-300 p-2 text-sm text-gray-600"
              >
                {String(cell)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
