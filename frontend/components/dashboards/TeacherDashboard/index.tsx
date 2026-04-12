import Link from 'next/link';

/**
 * Componente de dashboard dos professores
 */
const TeacherDashboard = ({ userName }: { userName: string }) => (
  <section className="max-w-6xl mx-auto p-6 md:p-10">
    <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-50 mb-2">
        Painel do Professor
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        Bem-vindo(a), Prof. {userName}. Aqui você gerencia suas turmas e
        acompanha seus alunos.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 border-t-4 border-t-blue-500 hover:-translate-y-1 transition-transform">
        <h3 className="font-bold text-gray-800 dark:text-white mb-1">
          Minhas Turmas
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Crie novas turmas ou edite as existentes.
        </p>
        <Link
          href="/my-classes"
          className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
        >
          Gerenciar Turmas &rarr;
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 border-t-4 border-t-green-500 hover:-translate-y-1 transition-transform">
        <h3 className="font-bold text-gray-800 dark:text-white mb-1">Alunos</h3>
        <p className="text-sm text-gray-500 mb-4">
          Adicione alunos às suas turmas e veja as matrículas.
        </p>
        <Link
          href="/my-students"
          className="text-sm font-bold text-green-600 dark:text-green-400 hover:underline"
        >
          Vincular Alunos &rarr;
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 border-t-4 border-t-purple-500 hover:-translate-y-1 transition-transform">
        <h3 className="font-bold text-gray-800 dark:text-white mb-1">
          Databases
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Acompanhe as resoluções de SQL de cada cenário de Banco de dados.
        </p>
        <Link
          href="/databases"
          className="text-sm font-bold text-purple-600 dark:text-purple-400 hover:underline"
        >
          Ver Databases &rarr;
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 border-t-4 border-t-orange-500 hover:-translate-y-1 transition-transform flex flex-col">
        <h3 className="font-bold text-gray-800 dark:text-white mb-1">
          Testar Consultas
        </h3>
        <p className="text-sm text-gray-500 mb-4 grow">
          Valide e teste as queries e gabaritos dos bancos de dados.
        </p>
        <Link
          href="/testing"
          className="text-sm font-bold text-orange-600 dark:text-orange-400 hover:underline mt-auto"
        >
          Acessar Validador &rarr;
        </Link>
      </div>
    </div>
  </section>
);

export default TeacherDashboard;
