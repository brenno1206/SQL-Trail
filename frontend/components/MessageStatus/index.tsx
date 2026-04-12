interface MessageStatusProps {
  isLoading: boolean;
  message: string;
}

/** Componente de mensagem de validação da consulta */
export function MessageStatus({ isLoading, message }: MessageStatusProps) {
  return (
    <div className="flex min-h-[60px] items-center space-x-3 rounded-lg p-4 shadow bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100">
      {isLoading && (
        <div
          id="spinner"
          className="h-5 w-5 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"
        ></div>
      )}
      <div
        id="message"
        className="font-medium text-gray-600 dark:text-gray-400"
      >
        {'Status da Consulta: ' + message}
      </div>
    </div>
  );
}
