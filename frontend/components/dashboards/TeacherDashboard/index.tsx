const TeacherDashboard = ({ userName }: { userName: string }) => (
  <section className="max-w-5xl mx-auto p-6 md:p-10">
    <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-50 mb-2">
        Painel do Professor
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        Bem-vindo(a), Prof. {userName}. Aqui você gerencia suas turmas e
        acompanha seus alunos.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition">
        <h3 className="text-xl font-bold text-blue-900 dark:text-blue-400 mb-2">
          Minhas Turmas
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Crie novas turmas ou edite as existentes.
        </p>
        <button className="w-full py-2 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition">
          Gerenciar Turmas
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition">
        <h3 className="text-xl font-bold text-green-900 dark:text-green-400 mb-2">
          Alunos
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Adicione alunos às suas turmas e veja as matrículas.
        </p>
        <button className="w-full py-2 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg font-semibold hover:bg-green-100 dark:hover:bg-green-900/50 transition">
          Vincular Alunos
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition">
        <h3 className="text-xl font-bold text-purple-900 dark:text-purple-400 mb-2">
          Desempenho
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Acompanhe as resoluções de SQL das suas turmas.
        </p>
        <button className="w-full py-2 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition">
          Ver Relatórios
        </button>
      </div>
    </div>
  </section>
);

export default TeacherDashboard;
