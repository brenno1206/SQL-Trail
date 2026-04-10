import { databases } from '@/types/databases';
import DatabaseCard from '@/components/DatabaseCard';

export default function StudentDashboard({ userName }: { userName: string }) {
  return (
    <>
      <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-50 mb-2">
          Painel do Aluno
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Bem-vindo(a), {userName}. Aqui você pode acessar os bancos de dados
          para praticar suas habilidades em SQL.
        </p>
      </div>
      <h1 className="text-4xl font-bold text-center text-gray-800 dark:text-gray-50 mb-12">
        Selecione o Banco de Dados
      </h1>

      <section className="max-w-4xl mx-auto p-6 md:p-10 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
          {databases.map(({ slug, title }) => (
            <DatabaseCard key={slug} slug={slug} title={title} />
          ))}
        </div>
      </section>
    </>
  );
}
