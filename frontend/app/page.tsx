import { Footer } from '@/components/Footer';
import Header from '@/components/Header';
import Link from 'next/link';
// 1. Importe os ícones que deseja usar
import { FaUsers, FaUniversity, FaUtensils, FaPiggyBank } from 'react-icons/fa';

export default function DatabasePage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="grow container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-12">
          Selecione o Banco de Dados
        </h1>

        <section className="max-w-4xl mx-auto p-6 md:p-10 bg-white rounded-xl shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
            {/* Database 1 */}
            <Link
              key={'recusosHumanos'}
              href={`/recusosHumanos`}
              className="group flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg shadow-md border border-gray-200 transition-all duration-300 hover:shadow-xl hover:bg-blue-50 hover:-translate-y-1"
            >
              <FaUsers className="text-4xl text-blue-600 mb-4 transition-colors group-hover:text-blue-700" />
              <h3 className="text-xl font-semibold text-gray-700 group-hover:text-blue-700">
                Recursos Humanos
              </h3>
            </Link>

            {/* Database 2 */}
            <Link
              key={'Universidade'}
              href={`/Universidade`}
              className="group flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg shadow-md border border-gray-200 transition-all duration-300 hover:shadow-xl hover:bg-blue-50 hover:-translate-y-1"
            >
              <FaUniversity className="text-4xl text-blue-600 mb-4 transition-colors group-hover:text-blue-700" />
              <h3 className="text-xl font-semibold text-gray-700 group-hover:text-blue-700">
                Universidade
              </h3>
            </Link>

            {/* Database 3 */}
            <Link
              key={'restaurante'}
              href={`/restaurante`}
              className="group flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg shadow-md border border-gray-200 transition-all duration-300 hover:shadow-xl hover:bg-blue-50 hover:-translate-y-1"
            >
              <FaUtensils className="text-4xl text-blue-600 mb-4 transition-colors group-hover:text-blue-700" />
              <h3 className="text-xl font-semibold text-gray-700 group-hover:text-blue-700">
                Restaurante
              </h3>
            </Link>

            {/* Database 4 */}
            <Link
              key={'banco'}
              href={`/banco`}
              className="group flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg shadow-md border border-gray-200 transition-all duration-300 hover:shadow-xl hover:bg-blue-50 hover:-translate-y-1"
            >
              <FaPiggyBank className="text-4xl text-blue-600 mb-4 transition-colors group-hover:text-blue-700" />
              <h3 className="text-xl font-semibold text-gray-700 group-hover:text-blue-700">
                Banco
              </h3>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
