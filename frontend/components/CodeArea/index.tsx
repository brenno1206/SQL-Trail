import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';

interface CodeAreaProps {
  sqlQuery: string;
  onEditorChange: (value: string) => void;
  validarConsulta: () => void;
}

export default function CodeArea({
  sqlQuery,
  onEditorChange,
  validarConsulta,
}: CodeAreaProps) {
  return (
    <article className="overflow-hidden rounded-lg bg-white shadow">
      <CodeMirror
        value={sqlQuery}
        height="45vh"
        extensions={[sql()]}
        onChange={onEditorChange}
        theme="light"
        className="border-b border-gray-200"
      />
      <button
        id="btnValidate"
        onClick={validarConsulta}
        className="w-full bg-blue-900 px-4 py-3 font-bold text-white transition-colors hover:bg-blue-700 active:bg-blue-800"
      >
        Validar Consulta
      </button>
    </article>
  );
}
