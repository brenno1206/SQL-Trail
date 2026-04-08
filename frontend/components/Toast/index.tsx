import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning';
  onClose?: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  const bgColor =
    type === 'success'
      ? 'bg-green-500'
      : type === 'error'
        ? 'bg-red-500'
        : 'bg-yellow-500 text-gray-900';

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 8000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 right-4 z-60 px-4 py-3 rounded-md shadow-lg text-white font-medium transition-all duration-300 animate-fade-in-down flex items-center justify-between gap-4 ${bgColor}`}
    >
      <span>{message}</span>

      <button
        onClick={onClose}
        className="shrink-0 hover:opacity-70 transition-opacity focus:outline-none cursor-pointer"
        aria-label="Fechar"
      >
        <svg
          className="w-4 h-4 fill-current"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10 8.586L2.929 1.515 1.515 2.929 8.586 10l-7.071 7.071 1.414 1.414L10 11.414l7.071 7.071 1.414-1.414L11.414 10l7.071-7.071-1.414-1.414L10 8.586z"
          />
        </svg>
      </button>
    </div>
  );
}
