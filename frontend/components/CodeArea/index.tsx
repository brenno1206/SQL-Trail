'use client';
import { useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';

interface CodeAreaProps {
  sqlQuery: string;
  onEditorChange: (value: string) => void;
  validarConsulta: () => void;
  disabled?: boolean;
  buttonLabel?: string;
}

/** Componente de área de código para digitação das consultas SQL */
export default function CodeArea({
  sqlQuery,
  onEditorChange,
  validarConsulta,
  disabled = false,
  buttonLabel = 'Validar Consulta',
}: CodeAreaProps) {
  // O tema é definido no cliente (window não existe na renderização do servidor).
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setTheme(media.matches ? 'dark' : 'light');
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return (
    <article className="overflow-hidden rounded-lg bg-white shadow">
      <CodeMirror
        value={sqlQuery}
        height="45vh"
        extensions={[sql()]}
        onChange={onEditorChange}
        theme={theme}
      />
      <button
        onClick={validarConsulta}
        disabled={disabled}
        className="w-full cursor-pointer bg-blue-900 py-3 font-bold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {buttonLabel}
      </button>
    </article>
  );
}
