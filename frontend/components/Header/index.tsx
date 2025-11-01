'use client';

import { useState } from 'react';
import Image from 'next/image';
import { QuestionListItem } from '@/types/Response';
import Link from 'next/link';
import { IoIosArrowDropleftCircle } from '@/assets/icons';

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
  const [isErdModalOpen, setIsErdModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);

  const showActionButtons = availableQuestions && availableQuestions.length > 0;

  const baseButtonStyles =
    'rounded-lg bg-white px-5 py-2.5 font-semibold cursor-pointer text-blue-900 shadow-md transition-all duration-200 ease-in-out hover:bg-blue-50 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-50';

  const modalCloseButtonStyles =
    'absolute -top-3 -right-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-3xl font-light text-gray-600 shadow-lg transition-all duration-200 ease-in-out hover:rotate-90 hover:bg-red-50 hover:text-red-600';

  return (
    <header
      className={
        'flex h-20 shrink-0 items-center bg-blue-900 px-10 py-4 text-white shadow-md' +
        (showActionButtons ? 'justify-between' : 'justify-center')
      }
    >
      <div className="flex flex-1 items-center justify-start gap-4">
        {slug && (
          <Link
            href={'/'}
            className="p-2 text-4xl hover:transition-all hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-50"
          >
            <IoIosArrowDropleftCircle className="hover:text-blue-50 " />
          </Link>
        )}
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

      <div className="flex flex-1 items-center justify-center">
        <h1 className="capitalize text-2xl font-bold">
          SQL Trail {slug ? '- ' + slug.replace(/-/g, ' ') : ''}
        </h1>
      </div>

      <div className="flex flex-1 items-center justify-end">
        {showActionButtons && (
          <button
            onClick={() => setIsErdModalOpen(true)}
            className={baseButtonStyles}
          >
            Ver Mapa Conceitual
          </button>
        )}
      </div>

      {isErdModalOpen && (
        <div
          id="erdModal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setIsErdModalOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl rounded-lg bg-white p-6 shadow-2xl"
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
            <Image
              src={`/${slug}.png`}
              alt="Mapa Conceitual"
              width={702}
              height={662}
              className="mt-4 h-auto w-full rounded-md border border-gray-200"
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
    </header>
  );
}
