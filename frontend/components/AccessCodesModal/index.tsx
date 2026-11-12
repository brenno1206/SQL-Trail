'use client';
import { CreatedStudentCode } from '@/types/models';

interface AccessCodesModalProps {
  codes: CreatedStudentCode[];
  warnings?: string[];
  title?: string;
  onClose: () => void;
}

/** Baixa os códigos em CSV (separador ";", compatível com Excel em português) */
function downloadCsv(codes: CreatedStudentCode[]) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = [
    'matricula;nome;codigo_de_acesso',
    ...codes.map((c) =>
      [c.registration_number, c.name, c.access_code].map(escape).join(';'),
    ),
  ];
  const blob = new Blob(['﻿' + lines.join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'codigos-primeiro-acesso.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Exibe os códigos de primeiro acesso gerados para alunos recém-cadastrados.
 * Os códigos só são mostrados uma vez: o professor deve entregá-los aos alunos.
 */
export default function AccessCodesModal({
  codes,
  warnings = [],
  title = 'Códigos de primeiro acesso',
  onClose,
}: AccessCodesModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl p-6 max-h-[90vh] flex flex-col">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
        {codes.length > 0 && (
          <p className="text-sm text-gray-600 mb-4">
            Entregue a cada aluno a sua matrícula e o código abaixo. No primeiro
            acesso, o aluno informa os dois e cria a própria senha.{' '}
            <strong>Os códigos não serão exibidos novamente.</strong>
          </p>
        )}
        {codes.length > 0 && (
          <div className="overflow-auto border border-gray-200 rounded mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left text-gray-700">
                <tr>
                  <th className="p-2">Matrícula</th>
                  <th className="p-2">Nome</th>
                  <th className="p-2">Código</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr
                    key={c.registration_number}
                    className="border-t border-gray-100"
                  >
                    <td className="p-2 font-mono">{c.registration_number}</td>
                    <td className="p-2">{c.name}</td>
                    <td className="p-2 font-mono font-bold tracking-wider text-blue-700">
                      {c.access_code}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded p-3 mb-4 overflow-auto max-h-40">
            <p className="font-bold mb-1">Avisos</p>
            <ul className="list-disc ml-5 space-y-1">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex justify-end gap-2 mt-auto">
          {codes.length > 0 && (
            <button
              onClick={() => downloadCsv(codes)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold cursor-pointer"
            >
              Baixar CSV
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 font-semibold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
