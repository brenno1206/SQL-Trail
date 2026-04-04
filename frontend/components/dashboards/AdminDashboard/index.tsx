import Link from 'next/link';

const AdminDashboard = ({ userName }: { userName: string }) => (
  <section className="max-w-6xl mx-auto p-6 md:p-10">
    <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-4 flex justify-between items-end">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-50 mb-2">
          Administração do Sistema
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Bem-vindo(a), {userName}. Você tem acesso total à plataforma.
        </p>
      </div>
      <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full uppercase tracking-wider">
        Super Admin
      </span>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 border-t-4 border-t-red-500 hover:-translate-y-1 transition-transform">
        <h3 className="font-bold text-gray-800 dark:text-white mb-1">
          Professores
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Cadastrar e gerenciar corpo docente.
        </p>
        <Link
          href="/admin/teachers"
          className="text-sm font-bold text-red-600 hover:underline"
        >
          Acessar Painel &rarr;
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 border-t-4 border-t-blue-500 hover:-translate-y-1 transition-transform">
        <h3 className="font-bold text-gray-800 dark:text-white mb-1">Turmas</h3>
        <p className="text-sm text-gray-500 mb-4">
          Visão global de todas as turmas ativas.
        </p>
        <Link
          href="/admin/classes"
          className="text-sm font-bold text-blue-600 hover:underline"
        >
          Acessar Painel &rarr;
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 border-t-4 border-t-green-500 hover:-translate-y-1 transition-transform">
        <h3 className="font-bold text-gray-800 dark:text-white mb-1">Alunos</h3>
        <p className="text-sm text-gray-500 mb-4">
          Gerenciar matrículas, senhas e acessos.
        </p>
        <Link
          href="/admin/students"
          className="text-sm font-bold text-green-600 hover:underline"
        >
          Acessar Painel &rarr;
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 border-t-4 border-t-gray-800 hover:-translate-y-1 transition-transform">
        <h3 className="font-bold text-gray-800 dark:text-white mb-1">
          Bancos & Questões
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Visualizar bases SQL e desafios.
        </p>
        <Link
          href="/admin/databases"
          className="text-sm font-bold text-gray-800 dark:text-gray-300 hover:underline"
        >
          Acessar Painel &rarr;
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 border-t-4 border-t-purple-500 hover:-translate-y-1 transition-transform">
        <h3 className="font-bold text-gray-800 dark:text-white mb-1">
          Administradores
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Gerenciar acessos e outros administradores.
        </p>
        <Link
          href="/admin/admins"
          className="text-sm font-bold text-purple-600 dark:text-purple-400 hover:underline"
        >
          Acessar Painel &rarr;
        </Link>
      </div>
    </div>
  </section>
);

export default AdminDashboard;
