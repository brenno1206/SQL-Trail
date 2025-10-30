'use client';

import { useState } from 'react';
import Image from 'next/image';
// TODO: Receber slug como parametro
interface HeaderProps {
  carregarQuestao?: () => void;
}

export default function Header({ carregarQuestao }: HeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <header
      className={
        'flex h-20 shrink-0 items-center bg-blue-900 px-10 py-4 text-white shadow-md ' +
        (carregarQuestao ? 'justify-between' : 'justify-center')
      }
    >
      {
        // TODO: Adicionar probabilidade de escolher questão com slug + id
        carregarQuestao && (
          <button
            id="btnNext"
            onClick={carregarQuestao}
            className="rounded-lg bg-blue-50 px-4 py-2 font-medium text-blue-900 transition-colors hover:bg-blue-100 active:bg-blue-200"
          >
            Selecionar Questão
          </button>
        )
      }

      <h1 className="text-2xl font-bold">SQL Trail</h1>
      {carregarQuestao && (
        <button
          id="btnToggleErd"
          onClick={() => setIsModalOpen(true)}
          className="rounded-lg bg-blue-50 px-4 py-2 font-medium text-blue-900 transition-colors hover:bg-blue-100 active:bg-blue-200"
        >
          Ver Mapa Conceitual
        </button>
      )}

      {
        // TODO: mostrar imagem de acordo com o slug
        isModalOpen && (
          <div
            id="erdModal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="relative w-full max-w-3xl rounded-lg bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <span
                className="absolute -top-3 -right-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white text-2xl text-gray-600 shadow-md transition-all hover:bg-gray-200 hover:text-black"
                onClick={() => setIsModalOpen(false)}
              >
                &times;
              </span>
              <h2 className="text-2xl font-bold text-gray-900">
                Mapa Conceitual
              </h2>
              <Image
                src="/modelo.png"
                alt="Mapa Conceitual"
                width={702}
                height={662}
                className="mt-4 w-full h-auto rounded-md border border-gray-200"
              />
            </div>
          </div>
        )
      }
    </header>
  );
}
