'use client';
import { useEffect, useRef } from 'react';
import { Notification } from '@/types/ui';

interface ToastProps extends Notification {
  onClose?: () => void;
}

/** Componente de Toast/Notificação (fecha sozinho após 8 segundos) */
export default function Toast({ message, type, onClose }: ToastProps) {
  // Guarda o callback mais recente sem reiniciar o temporizador a cada renderização do pai.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => onCloseRef.current?.(), 8000);
    return () => clearTimeout(timer);
  }, [message, type]);

  const bgColor =
    type === 'success'
      ? 'bg-green-500'
      : type === 'error'
        ? 'bg-red-500'
        : 'bg-yellow-500 text-gray-900';

  return (
    <div
      role="status"
      className={`fixed top-4 right-4 z-60 max-w-md px-4 py-3 rounded-md shadow-lg text-white font-medium transition-all duration-300 flex items-center justify-between gap-4 ${bgColor}`}
    >
      <span>{message}</span>
      <button
        onClick={() => onCloseRef.current?.()}
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
