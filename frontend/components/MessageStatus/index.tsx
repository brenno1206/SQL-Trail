interface MessageStatusProps {
  isLoading: boolean;
  message: string;
  /** Define a cor da mensagem */
  tone?: 'neutral' | 'success' | 'error';
}

/** Componente de mensagem de validação da consulta */
export function MessageStatus({
  isLoading,
  message,
  tone = 'neutral',
}: MessageStatusProps) {
  const color =
    tone === 'success'
      ? 'text-green-700 dark:text-green-400'
      : tone === 'error'
        ? 'text-red-700 dark:text-red-400'
        : 'text-gray-600 dark:text-gray-400';
  return (
    <div
      aria-live="polite"
      className="flex min-h-[60px] items-center space-x-3 rounded-lg p-4 shadow bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100"
    >
      {isLoading && (
        <div className="h-5 w-5 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
      )}
      <div className={`font-medium ${color}`}>
        {message
          ? `Status da Consulta: ${message}`
          : 'Status da Consulta: aguardando execução.'}
      </div>
    </div>
  );
}
