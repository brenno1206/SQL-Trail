/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  IoIosMore,
  FaMap,
  TiThMenu,
  MdLogout,
  IoMdCloseCircleOutline,
  IoMdCheckmarkCircleOutline,
} from '@/assets/icons';
import { Question } from '@/types/models';

interface HeaderProps {
  slug?: string;
  allQuestions?: Question[];
  completedIds?: number[];
  skippedIds?: number[];
  onQuestionSelect?: (id: number) => void;
}

/** Componente de cabeçalho
 * - Exibe o título do SQL Trail
 * - Botão para abrir o modal de progresso (se houver questões)
 * - Botão para abrir o modal do mapa conceitual (se houver questões)
 * - Menu lateral com informações do usuário e opções de navegação
 */
export default function Header({
  slug,
  allQuestions,
  completedIds = [],
  skippedIds = [],
  onQuestionSelect,
}: HeaderProps) {
  const { user, logout, isAuthenticated } = useAuth();

  const [isErdModalOpen, setIsErdModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const showActionButtons = allQuestions && allQuestions.length > 0;

  const baseButtonStyles =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base font-bold text-blue-900 shadow-sm transition-all duration-200 ease-out hover:bg-blue-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-blue-900 cursor-pointer border border-transparent hover:border-blue-100';

  const modalCloseButtonStyles =
    'absolute -top-3 -right-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-3xl font-light text-gray-600 shadow-lg transition-all duration-200 ease-in-out hover:rotate-90 hover:bg-red-50 hover:text-red-600';

  const sortedQuestions = allQuestions
    ? [...allQuestions].sort((a, b) => {
        if (a.is_special !== b.is_special) {
          return a.is_special ? -1 : 1;
        }
        return a.question_number - b.question_number;
      })
    : [];

  const firstUncompletedId = sortedQuestions.find(
    (q) => !completedIds.includes(q.id) && !skippedIds.includes(q.id),
  )?.id;

  return (
    <>
      <header
        className={
          'flex h-20 shrink-0 items-center bg-blue-900 px-4 md:px-10 py-4 text-white shadow-md ' +
          (showActionButtons ? 'justify-between' : 'justify-center')
        }
      >
        <div className="flex flex-1 items-center justify-start">
          {showActionButtons && (
            <button
              id="btnNext"
              onClick={() => setIsQuestionModalOpen(true)}
              className={baseButtonStyles}
              title="Ver Progresso"
            >
              <IoIosMore className="w-7 h-7" />
              <span className="hidden sm:inline">Ver Progresso</span>
              <span className="inline sm:hidden">Progresso</span>
            </button>
          )}
        </div>

        <Link
          href="/"
          className="flex flex-1 items-center justify-center px-2 min-w-0"
        >
          <h1 className="capitalize text-lg md:text-2xl font-bold cursor-pointer truncate text-center">
            SQL Trail {slug ? '- ' + slug.replace(/-/g, ' ') : ''}
          </h1>
        </Link>

        <div className="flex flex-1 items-center justify-end gap-2 md:gap-4">
          {showActionButtons && (
            <button
              onClick={() => setIsErdModalOpen(true)}
              className={baseButtonStyles}
              title="Ver Mapa Conceitual"
            >
              <FaMap className="w-5 h-5" />
              <span className="hidden sm:inline">Ver Mapa Conceitual</span>
              <span className="inline sm:hidden">Mapa</span>
            </button>
          )}

          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-white hover:bg-blue-800 rounded-xl transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
            aria-label="Abrir menu"
          >
            <TiThMenu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {isErdModalOpen && (
        <div
          id="erdModal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 px-20 overflow-y-auto backdrop-blur-sm"
          onClick={() => setIsErdModalOpen(false)}
        >
          <div
            className="relative h-full max-h-14/15 rounded-2xl bg-white p-6 shadow-2xl"
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
              className="mt-4 h-auto max-h-5/6 rounded-lg border border-gray-200"
            />
          </div>
        </div>
      )}

      {isQuestionModalOpen && sortedQuestions.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setIsQuestionModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className={modalCloseButtonStyles}
              onClick={() => setIsQuestionModalOpen(false)}
            >
              &times;
            </span>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Progresso - {slug}
            </h2>
            <ul className="flex max-h-[60vh] flex-col space-y-3 overflow-y-auto pr-2">
              {sortedQuestions.map((q) => {
                const isCompleted = completedIds.includes(q.id);
                const isSkipped = skippedIds.includes(q.id) && !isCompleted;
                const isCurrent = q.id === firstUncompletedId;
                const isLocked = !isCompleted && !isSkipped && !isCurrent;

                return (
                  <li key={q.id} className="flex flex-col">
                    <button
                      disabled={isLocked}
                      onClick={() => {
                        if (onQuestionSelect && !isLocked) {
                          onQuestionSelect(q.id);
                          setIsQuestionModalOpen(false);
                        }
                      }}
                      className={`w-full rounded-xl p-4 text-left border transition-all ${
                        isLocked
                          ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                          : isCurrent
                            ? 'bg-blue-50 border-blue-400 hover:bg-blue-100 cursor-pointer shadow-sm'
                            : isSkipped
                              ? 'bg-orange-50 border-orange-200 hover:bg-orange-100 cursor-pointer'
                              : 'bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer'
                      }`}
                    >
                      <strong
                        className={`inline-flex items-center gap-2 mb-1 ${
                          isCompleted
                            ? 'text-green-800'
                            : isCurrent
                              ? 'text-blue-800'
                              : isSkipped
                                ? 'text-orange-800'
                                : 'text-gray-500'
                        }`}
                      >
                        {isCompleted ? (
                          <IoMdCheckmarkCircleOutline className="text-green-600 text-2xl stroke-2" />
                        ) : isSkipped ? (
                          <div className="w-5 h-5 flex items-center justify-center rounded-full border-2 border-orange-500 text-orange-600 font-bold text-xs">
                            !
                          </div>
                        ) : isCurrent ? (
                          <div className="w-5 h-5 rounded-full border-4 border-blue-500 animate-pulse" />
                        ) : (
                          <div className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold">
                            X
                          </div>
                        )}
                        <span>
                          Questão {q.question_number}
                          {q.is_special && (
                            <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                              Especial
                            </span>
                          )}
                          {isCurrent && (
                            <span className="ml-2 text-[10px] uppercase bg-blue-600 text-white px-2 py-0.5 rounded-md font-bold">
                              Atual
                            </span>
                          )}
                          {isSkipped && (
                            <span className="ml-2 text-[10px] uppercase bg-orange-200 text-orange-800 px-2 py-0.5 rounded-md font-bold">
                              Pulada
                            </span>
                          )}
                        </span>
                      </strong>
                      <p
                        className={`text-sm mt-1 ml-7 ${
                          isLocked ? 'text-gray-400' : 'text-gray-700'
                        }`}
                      >
                        {q.statement?.substring(0, 90)}...
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
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
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-200 cursor-pointer"
          >
            <IoMdCloseCircleOutline className="w-6 h-6" />
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
              <span className="text-xs font-bold px-2.5 py-1 bg-blue-600 text-white rounded w-fit capitalize mt-1 shadow-sm">
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
              className="px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all font-semibold"
            >
              Início
            </Link>

            {!isAuthenticated && (
              <Link
                href="/login"
                onClick={() => setIsSidebarOpen(false)}
                className="px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all font-semibold"
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
              className="w-full py-3.5 flex items-center justify-center gap-2 text-red-600 font-bold bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              <MdLogout className="w-5 h-5 font-bold" />
              Sair da Conta
            </button>
          </div>
        )}
      </div>
    </>
  );
}
