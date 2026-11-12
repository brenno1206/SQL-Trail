# SQL Trail

### Projeto de Iniciação Científica - Ciclo de 2025/2 à 2026/1

**Uma abordagem prática e progressiva para o aprendizado de SQL**

---

## 📌 Sobre o Projeto

O **SQL Trail** é uma plataforma educacional web voltada ao ensino prático de SQL por meio da resolução de desafios com **feedback imediato**.

A aplicação simula cenários reais de bancos de dados relacionais, permitindo que os alunos executem consultas SQL diretamente no navegador e recebam validação automática, promovendo aprendizado ativo e orientado à prática.

Diferente das abordagens lineares, os desafios seguem uma lógica de **Teste Adaptativo Computadorizado (CAT)**: as questões de cada cenário formam uma trilha ordenada por dificuldade, percorrida como uma árvore de busca binária:

- o aluno começa pela questão de dificuldade mediana;
- **acerto** → segue para uma questão de nível superior;
- **erro** → recebe o feedback (erro de sintaxe ou lógico) e pode tentar novamente;
- **pulo** (liberado após 3 minutos na questão) → segue para uma questão de nível inferior, reforçando os fundamentos.

O sistema conta com **autenticação e controle de acesso** para três perfis: alunos, professores e administradores.

---

## 🏗️ Arquitetura da Aplicação

Arquitetura cliente-servidor baseada em uma API RESTful.

### 🎨 Frontend

- React, TypeScript, Next.js (App Router) e Tailwind CSS
- Axios para a comunicação com a API, com token JWT gerenciado via Context API

Responsável por:

- Interface interativa para execução de queries SQL (editor CodeMirror)
- Dashboards específicos por perfil (Admin, Professor e Aluno)
- Proteção de rotas e logout automático (inatividade ou sessão expirada)
- Visualização da trilha, do progresso e das métricas

### ⚙️ Backend

- Python e Flask (Application Factory)
- Camadas separadas: `routes` (HTTP) → `services` (regras de negócio)
- `utils`: decorators de autorização e serializers

Principais serviços:

- **SubmissionService**: sessões adaptativas (CAT) e registro das tentativas
- **SQLGrader**: validação de segurança das consultas e correção em três níveis (estrutural exato, ordem flexível e busca flexível avançada, que aceita colunas extras)
- **SupabaseService**: execução das consultas nos cenários via RPC
- **QuestionService / ScenarioDatabaseService**: cenários e trilha de questões
- **ClassroomService / ReportService**: turmas, matrículas e métricas de desempenho
- **AuthService**: usuários, primeiro acesso e emissão dos tokens JWT

### 🗄️ Bancos de Dados

- **Banco da aplicação — SQLite** (SQLAlchemy / Flask-SQLAlchemy): usuários, turmas, questões, sessões adaptativas e submissões.
- **Ambiente de execução (sandbox) — Supabase/PostgreSQL**: um banco isolado por cenário, identificado pelo slug, acessado por uma função RPC somente leitura.

---

## 🔐 Sistema de Autenticação

- Login com token JWT e controle de acesso por perfil (Aluno, Professor e Administrador), no frontend e no backend
- Professores só acessam as próprias turmas e os alunos matriculados nelas
- Alunos fazem o primeiro acesso com a matrícula e um **código de acesso** gerado pelo professor ao matriculá-los
- Os gabaritos das questões nunca são enviados aos alunos

---

## 📂 Estrutura do Projeto

```bash
.
├── backend/
│   ├── app/
│   │   ├── config/        # Configurações do sistema
│   │   ├── database/      # Modelos, conexão (SQLAlchemy), migração leve e seed
│   │   ├── routes/        # Controladores de rotas RESTful
│   │   ├── services/      # Camada de regras de negócio
│   │   └── utils/         # Decorators e Serializers
│   ├── tests/             # Testes automatizados (pytest)
│   └── wsgi.py            # Ponto de entrada WSGI
│
├── frontend/
│   ├── app/               # Rotas (App Router)
│   │   ├── (auth)/        # Login
│   │   ├── (student)/     # Área de resolução de desafios
│   │   ├── (teacher)/     # Gestão de turmas e alunos
│   │   ├── (admin)/       # Área administrativa
│   │   └── (admin-teacher)/  # Bancos, questões e validador de gabaritos
│   ├── components/        # Componentes reutilizáveis de UI
│   ├── contexts/          # Context API (Auth)
│   ├── lib/               # Integração com a API do backend
│   └── types/             # Tipagens TypeScript
│
└── readme.md
```

---

## ▶️ Como executar o Projeto

- [Visualizar instruções de execução](execution.md)

---

## 📋 TO DOs

- Corrigir consultas com Árvore de Sintaxe ou algo parecido
- Unificar as tabelas de usuários: uma tabela `user` e outra `role`, em vez de uma tabela por papel
- Adicionar mais cenários de questões
- Avaliar a troca do PostgreSQL (Supabase) por MySQL nos cenários
- Aplicar a Teoria de Resposta ao Item (TRI) na calibração da dificuldade das questões
- Coletar o coeficiente de rendimento e as notas dos alunos em disciplinas de Banco de Dados
- Adicionar cenários NoSQL com MongoDB
- Analisar as consultas com árvores de sintaxe abstrata
- Testar a aplicação com alunos para coletar dados para a TRI

---

## 📜 License

This project is licensed under the Creative Commons BY-NC 4.0 License — see the LICENSE file for details.
