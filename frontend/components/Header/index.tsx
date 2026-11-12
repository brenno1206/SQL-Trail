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
  /** Nome do cenário exibido no título (padrão: slug) */
  title?: string;
  /** Imagem do diagrama (mapa conceitual) do cenário */
  diagramUrl?: string;
  allQuestions?: Question[];
  masteredUntil?: number;
  currentQuestionId?: number | null;
  skippedOrders?: number[];
  solvedQuestionIds?: number[];
  onQuestionSelect?: (id: number) => void;
}

type TrailStatus = 'solved' | 'mastered' | 'current' | 'skipped' | 'locked';

const STATUS_STYLES: Record<
  TrailStatus,
  { card: string; title: string; badge?: string; label?: string }
> = {
  solved: {
    card: 'bg-green-50 border-green-200 cursor-pointer hover:bg-green-100',
    title: 'text-green-800',
    badge: 'bg-green-200 text-green-800',
    label: 'Resolvida',
  },
  mastered: {
    card: 'bg-emerald-50/60 border-emerald-100 cursor-pointer hover:bg-emerald-100',
    title: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700',
    label: 'Nível dominado',
  },
  current: {
    card: 'bg-blue-50 border-blue-400 shadow-sm cursor-pointer hover:bg-blue-100',
    title: 'text-blue-800',
    badge: 'bg-blue-600 text-white',
    label: 'Atual',
  },
  skipped: {
    card: 'bg-red-50 border-red-200 cursor-pointer hover:bg-red-100',
    title: 'text-red-800',
    badge: 'bg-red-200 text-red-800',
    label: 'Lacuna',
  },
  locked: {
    card: 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed',
    title: 'text-gray-500',
  },
};

function truncate(text = '', max = 90) {
  return text.length > max ? `${text.substring(0, max).trimEnd()}...` : text;
}

/** Cabeçalho da aplicação, com mapa conceitual e progresso da trilha nas telas de desafio */
export default function Header({
  slug,
  title,
  diagramUrl,
  allQuestions,
  masteredUntil = 0,
  currentQuestionId = null,
  skippedOrders = [],
  solvedQuestionIds = [],
  onQuestionSelect,
}: HeaderProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const [isErdModalOpen, setIsErdModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const showActionButtons = !!allQuestions && allQuestions.length > 0;

  const baseButtonStyles =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base font-bold text-blue-900 shadow-sm transition-all duration-200 ease-out hover:bg-blue-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer border border-transparent';

  const modalCloseButtonStyles =
    'absolute -top-3 -right-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-3xl font-light text-gray-600 shadow-lg transition-all duration-200 ease-in-out hover:rotate-90 hover:bg-red-50 hover:text-red-600 z-50';

  const trailQuestions = (allQuestions || [])
    .filter((q) => !q.is_special)
    .sort((a, b) => a.question_order - b.question_order);
  const specialQuestions = (allQuestions || [])
    .filter((q) => q.is_special)
    .sort((a, b) => a.question_order - b.question_order);

  const statusOf = (q: Question): TrailStatus => {
    if (q.id === currentQuestionId) return 'current';
    if (solvedQuestionIds.includes(q.id)) return 'solved';
    if (skippedOrders.includes(q.question_order)) return 'skipped';
    if (q.question_order <= masteredUntil) return 'mastered';
    return 'locked';
  };

  const selectQuestion = (id: number) => {
    onQuestionSelect?.(id);
    setIsQuestionModalOpen(false);
  };

  const renderStatusIcon = (status: TrailStatus) => {
    if (status === 'solved' || status === 'mastered') {
      return (
        <IoMdCheckmarkCircleOutline className="text-green-600 text-2xl stroke-2" />
      );
    }
    if (status === 'skipped') {
      return (
        <div className="w-5 h-5 flex items-center justify-center rounded-full border-2 border-red-500 text-red-600 font-bold text-xs">
          !
        </div>
      );
    }
    if (status === 'current') {
      return (
        <div className="w-5 h-5 rounded-full border-4 border-blue-500 animate-pulse" />
      );
    }
    return (
      <div className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold">
        X
      </div>
    );
  };

  const headerTitle = title || (slug ? slug.replace(/-/g, ' ') : '');

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
          <h1 className="text-lg md:text-2xl font-bold cursor-pointer truncate text-center">
            SQL Trail{headerTitle ? ` - ${headerTitle}` : ''}
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
            aria-label="Abrir menu"
            className="p-2 text-white hover:bg-blue-800 rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            <TiThMenu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Modal do Mapa Conceitual */}
      {isErdModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm"
          onClick={() => setIsErdModalOpen(false)}
        >
          <div
            className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-white p-4 sm:p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={modalCloseButtonStyles}
              onClick={() => setIsErdModalOpen(false)}
              aria-label="Fechar"
            >
              &times;
            </button>
            <h2 className="mb-4 text-xl sm:text-2xl font-bold text-gray-900 shrink-0">
              Mapa Conceitual
            </h2>
            <div className="flex-1 min-h-0 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-2 sm:p-4">
              <img
                src={diagramUrl || `/${slug}.png`}
                alt="Mapa Conceitual"
                className="max-w-full max-h-full object-contain drop-shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal da Árvore de Progresso */}
      {isQuestionModalOpen && showActionButtons && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setIsQuestionModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={modalCloseButtonStyles}
              onClick={() => setIsQuestionModalOpen(false)}
              aria-label="Fechar"
            >
              &times;
            </button>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">
              Progresso - {slug}
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              <strong>Resolvida</strong>: você acertou a questão.{' '}
              <strong>Nível dominado</strong>: inferido pela trilha adaptativa a
              partir dos seus acertos. <strong>Lacuna</strong>: questão pulada.
              Você pode rever e refazer essas questões a qualquer momento.
            </p>
            <ul className="flex max-h-[50vh] flex-col space-y-3 overflow-y-auto pr-2">
              {trailQuestions.map((q) => {
                const status = statusOf(q);
                const style = STATUS_STYLES[status];
                const isLocked = status === 'locked';
                return (
                  <li key={q.id} className="flex flex-col">
                    <button
                      disabled={isLocked}
                      onClick={() => !isLocked && selectQuestion(q.id)}
                      className={`w-full rounded-xl p-4 text-left border transition-all ${style.card}`}
                    >
                      <strong
                        className={`inline-flex items-center gap-2 mb-1 ${style.title}`}
                      >
                        {renderStatusIcon(status)}
                        <span>
                          Questão {q.question_order}
                          {style.label && (
                            <span
                              className={`ml-2 text-[10px] uppercase px-2 py-0.5 rounded-md font-bold ${style.badge}`}
                            >
                              {style.label}
                            </span>
                          )}
                        </span>
                      </strong>
                      <p
                        className={`text-sm mt-1 ml-7 ${isLocked ? 'text-gray-400' : 'text-gray-700'}`}
                      >
                        {truncate(q.statement)}
                      </p>
                    </button>
                  </li>
                );
              })}

              {specialQuestions.length > 0 && (
                <li className="pt-2">
                  <h3 className="text-sm font-bold uppercase text-purple-700 mb-2">
                    Desafios especiais (fora da trilha)
                  </h3>
                  <ul className="space-y-3">
                    {specialQuestions.map((q) => (
                      <li key={q.id}>
                        <button
                          onClick={() => selectQuestion(q.id)}
                          className="w-full rounded-xl p-4 text-left border bg-purple-50 border-purple-200 cursor-pointer hover:bg-purple-100"
                        >
                          <strong className="inline-flex items-center gap-2 mb-1 text-purple-800">
                            Desafio {q.question_order}
                            {solvedQuestionIds.includes(q.id) && (
                              <span className="text-[10px] uppercase px-2 py-0.5 rounded-md font-bold bg-green-200 text-green-800">
                                Resolvida
                              </span>
                            )}
                          </strong>
                          <p className="text-sm mt-1 text-gray-700">
                            {truncate(q.statement)}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              )}
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
        className={`fixed top-0 right-0 z-50 h-screen w-72 bg-white shadow-2xl transition-transform duration-300 ease-in-out transform flex flex-col ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Menu</h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Fechar menu"
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
              <span className="text-xs font-bold px-2.5 py-1 bg-blue-600 text-white rounded w-fit mt-1 shadow-sm">
                {user.role === 'student'
                  ? 'Aluno'
                  : user.role === 'teacher'
                    ? 'Professor'
                    : 'Administrador'}
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
          </nav>
        </div>
        {isAuthenticated && (
          <div className="p-5 border-t border-gray-100">
            <button
              onClick={() => {
                setIsSidebarOpen(false);
                logout();
              }}
              className="w-full py-3.5 flex items-center justify-center gap-2 text-red-600 font-bold bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              <MdLogout className="w-5 h-5 font-bold" /> Sair da Conta
            </button>
          </div>
        )}
      </div>
    </>
  );
}
