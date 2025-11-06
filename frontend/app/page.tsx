import DatabaseCard from '@/components/DatabaseCard';
import { Footer } from '@/components/Footer';
import Header from '@/components/Header';
import { databases } from '@/types/databases';

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
            {databases.map(({ slug, title }) => (
              <DatabaseCard key={slug} slug={slug} title={title} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
