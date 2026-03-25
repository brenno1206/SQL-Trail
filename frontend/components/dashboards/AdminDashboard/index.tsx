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
        <button className="text-sm font-bold text-red-600 hover:underline">
          Acessar Painel &rarr;
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 border-t-4 border-t-blue-500 hover:-translate-y-1 transition-transform">
        <h3 className="font-bold text-gray-800 dark:text-white mb-1">
          Todas as Turmas
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Visão global de todas as turmas ativas.
        </p>
        <button className="text-sm font-bold text-blue-600 hover:underline">
          Acessar Painel &rarr;
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 border-t-4 border-t-green-500 hover:-translate-y-1 transition-transform">
        <h3 className="font-bold text-gray-800 dark:text-white mb-1">
          Todos os Alunos
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Gerenciar matrículas, senhas e acessos.
        </p>
        <button className="text-sm font-bold text-green-600 hover:underline">
          Acessar Painel &rarr;
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 border-t-4 border-t-gray-800 hover:-translate-y-1 transition-transform">
        <h3 className="font-bold text-gray-800 dark:text-white mb-1">
          Bancos & Questões
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Administrar bases SQL e desafios.
        </p>
        <button className="text-sm font-bold text-gray-800 dark:text-gray-300 hover:underline">
          Acessar Painel &rarr;
        </button>
      </div>
    </div>
  </section>
);

export default AdminDashboard;
