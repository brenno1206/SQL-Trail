'use client';

import { useState } from 'react';
import { QuestionListItem } from '@/types/Response';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  slug?: string;
  availableQuestions?: QuestionListItem[];
  onQuestionSelect?: (id: number) => void;
}

export default function Header({
  slug,
  availableQuestions,
  onQuestionSelect,
}: HeaderProps) {
  const { user, logout, isAuthenticated } = useAuth();

  const [isErdModalOpen, setIsErdModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const showActionButtons = availableQuestions && availableQuestions.length > 0;

  const baseButtonStyles =
    'rounded-lg bg-white px-5 py-2.5 font-semibold cursor-pointer text-blue-900 shadow-md transition-all duration-200 ease-in-out hover:bg-blue-50 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-50 cursor-pointer';

  const modalCloseButtonStyles =
    'absolute -top-3 -right-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-3xl font-light text-gray-600 shadow-lg transition-all duration-200 ease-in-out hover:rotate-90 hover:bg-red-50 hover:text-red-600';

  return (
    <>
      <header
        className={
          'flex h-20 shrink-0 items-center bg-blue-900 px-10 py-4 text-white shadow-md ' +
          (showActionButtons ? 'justify-between' : 'justify-center')
        }
      >
        <div className="flex flex-1 items-center justify-start gap-4">
          {showActionButtons && (
            <button
              id="btnNext"
              onClick={() => setIsQuestionModalOpen(true)}
              className={baseButtonStyles}
            >
              Selecionar Questão
            </button>
          )}
        </div>

        <Link href="/" className="flex flex-1 items-center justify-center">
          <h1 className="capitalize text-2xl font-bold cursor-pointer">
            SQL Trail {slug ? '- ' + slug.replace(/-/g, ' ') : ''}
          </h1>
        </Link>

        <div className="flex flex-1 items-center justify-end gap-4">
          {showActionButtons && (
            <button
              onClick={() => setIsErdModalOpen(true)}
              className={baseButtonStyles}
            >
              Ver Mapa Conceitual
            </button>
          )}

          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-white hover:bg-blue-800 rounded-lg transition-colors focus:outline-none cursor-pointer"
            aria-label="Abrir menu"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </header>

      {isErdModalOpen && (
        <div
          id="erdModal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 px-20 overflow-y-auto"
          onClick={() => setIsErdModalOpen(false)}
        >
          <div
            className="relative h-full max-h-14/15 rounded-lg bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className={modalCloseButtonStyles}
              onClick={() => setIsErdModalOpen(false)}
            >
              &times;
            </span>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Mapa Conceitual
            </h2>
            <img
              src={`/${slug}.png`}
              alt="Mapa Conceitual"
              className="mt-4 h-auto max-h-5/6 rounded-md border border-gray-200"
            />
          </div>
        </div>
      )}

      {isQuestionModalOpen && availableQuestions && onQuestionSelect && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setIsQuestionModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className={modalCloseButtonStyles}
              onClick={() => setIsQuestionModalOpen(false)}
            >
              &times;
            </span>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Questões - {slug}
            </h2>
            <ul className="flex max-h-96 flex-col space-y-2 overflow-y-auto divide-y divide-gray-200">
              {availableQuestions.map((q, index) => (
                <li key={q.id} className="flex flex-col center">
                  <button
                    onClick={() => {
                      onQuestionSelect(q.id);
                      setIsQuestionModalOpen(false);
                    }}
                    className="w-full rounded-lg p-4 text-left text-gray-800 transition-all duration-200 ease-in-out hover:bg-blue-50 hover:pl-6"
                  >
                    <strong>Questão {index + 1}:</strong>{' '}
                    {q.enunciado.substring(0, 100)}...
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* COMPONENTIZAR */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed top-0 right-0 z-50 h-screen w-72 bg-white shadow-2xl transition-transform duration-300 ease-in-out transform flex flex-col ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Menu</h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-6 flex-1">
          {isAuthenticated && user ? (
            <div className="flex flex-col gap-1 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-xs text-blue-600/80 font-medium uppercase tracking-wider">
                Conta
              </span>
              <span className="font-bold text-blue-950 text-lg truncate">
                {user.name}
              </span>
              <span className="text-xs font-bold px-2.5 py-1 bg-blue-600 text-white rounded w-fit capitalize mt-1">
                {user.role}
              </span>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-sm text-gray-600">
                Nenhum usuário logado.
              </span>
            </div>
          )}

          <nav className="flex flex-col gap-2">
            <Link
              href="/"
              onClick={() => setIsSidebarOpen(false)}
              className="px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors font-semibold"
            >
              Início
            </Link>

            {!isAuthenticated && (
              <Link
                href="/login"
                onClick={() => setIsSidebarOpen(false)}
                className="px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors font-semibold"
              >
                Fazer Login
              </Link>
            )}
          </nav>
        </div>

        {isAuthenticated && (
          <div className="p-5 border-t border-gray-100">
            <button
              onClick={() => {
                logout();
                setIsSidebarOpen(false);
              }}
              className="w-full py-3.5 flex items-center justify-center gap-2 text-red-600 font-bold bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-200 active:scale-95"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sair da Conta
            </button>
          </div>
        )}
      </div>
    </>
  );
}
