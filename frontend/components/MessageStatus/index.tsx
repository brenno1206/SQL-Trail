interface MessageStatusProps {
  isLoading: boolean;
  message: string;
}

export function MessageStatus({ isLoading, message }: MessageStatusProps) {
  return (
    <div className="flex min-h-[60px] items-center space-x-3 rounded-lg bg-white p-4 shadow">
      {isLoading && (
        <div
          id="spinner"
          className="h-5 w-5 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"
        ></div>
      )}
      <div id="message" className="font-medium text-gray-700">
        {'Status da Consulta: ' + message}
      </div>
    </div>
  );
}
