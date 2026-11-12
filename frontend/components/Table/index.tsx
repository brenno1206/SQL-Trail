import { TableCell, TableData } from '@/types/Table';

function formatCell(cell: TableCell) {
  if (cell === null || cell === undefined) return null;
  if (typeof cell === 'object') return JSON.stringify(cell);
  return String(cell);
}

/** Componente de tabela de resultado das queries */
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
          {data.columns.map((col, colIndex) => (
            <th
              key={`${colIndex}-${col}`}
              className="border border-gray-400 p-2 text-left font-bold text-gray-700 bg-gray-300"
            >
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="odd:bg-white even:bg-gray-50">
            {row.map((cell, cellIndex) => {
              const text = formatCell(cell);
              return (
                <td
                  key={`${rowIndex}-${cellIndex}`}
                  className="border border-gray-300 p-2 text-sm text-gray-600"
                >
                  {text === null ? (
                    <span className="italic text-gray-400">NULL</span>
                  ) : (
                    text
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
