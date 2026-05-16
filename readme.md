# SQL Trail

### Projeto de Iniciação Científica - Ciclo de 2025/2 à 2026/1

**Uma abordagem prática e progressiva para o aprendizado de SQL**

---

## 📌 Sobre o Projeto

O **SQL Trail** é uma plataforma educacional web voltada ao ensino prático de SQL por meio da resolução progressiva de desafios com **feedback imediato**.

A aplicação simula cenários reais de bancos de dados relacionais, permitindo que usuários executem consultas SQL diretamente no navegador e recebam validação automática, promovendo aprendizado ativo e orientado à prática.

O sistema conta com **autenticação e controle de acesso**, possibilitando diferentes perfis de uso, como alunos, professores e administradores.

---

## 🏗️ Arquitetura da Aplicação

A aplicação segue uma arquitetura moderna baseada em separação de responsabilidades:

### 🎨 Frontend

Desenvolvido com:

- React
- TypeScript
- Next.js (App Router)
- Tailwind CSS

Responsável por:

- Interface interativa para execução de queries SQL
- Dashboards específicos por perfil (Admin, Professor e Aluno)
- Controle de autenticação no cliente
- Proteção de rotas (Protected Routes)
- Visualização de progresso, resultados e métricas

---

### ⚙️ Backend

Desenvolvido com:

- Python
- Flask (Application Factory Pattern)
- API RESTful

Responsável por:

- Autenticação e autorização de usuários
- Processamento e validação de queries SQL
- Gerenciamento de desafios, turmas e usuários
- Geração de relatórios e métricas
- Organização modular por domínio (`auth`, `classrooms`, `reports`, etc.)

A API segue boas práticas REST e organização em camadas:

- `routes` → definição dos endpoints
- `services` → regras de negócio
- `decorators` → controle de acesso e autenticação

---

### 🗄️ Banco de Dados

- MySQL (TiDB Cloud)

Responsável por:

- Armazenamento de usuários e autenticação
- Persistência de desafios e bancos simulados
- Controle de progresso dos alunos
- Dados de turmas e relatórios

---

## 🔐 Sistema de Autenticação

A aplicação possui autenticação completa com:

- Login de usuários
- Controle de sessão/token
- Proteção de rotas no frontend e backend
- Diferentes níveis de acesso:
  - Aluno
  - Professor
  - Administrador

---

## 📂 Estrutura do Projeto

```bash
.
├── backend/
│   ├── app/
│   │   ├── auth/          # Autenticação e autorização
│   │   ├── classrooms/    # Gerenciamento de turmas
│   │   ├── database/      # Modelos e conexão
│   │   ├── main/          # Lógica principal (queries/desafios)
│   │   ├── reports/       # Relatórios e métricas
│   │   └── config/        # Configurações
│   └── app.py             # Inicialização (Application Factory)
│
├── frontend/
│   ├── app/               # Rotas (App Router)
│   │   ├── (auth)/        # Login
│   │   ├── (student)/     # Área do aluno
│   │   ├── (teacher)/     # Área do professor
│   │   ├── (admin)/       # Área administrativa
│   │   └── (admin-teacher)/
│   │
│   ├── components/        # Componentes reutilizáveis
│   ├── contexts/          # Context API (Auth)
│   ├── lib/               # Integração com API
│   └── types/             # Tipagens TypeScript
│
└── README.md
```

---

## ▶️ Como executar o Projeto

- [Visualizar instruções de execução](execution.md)

---

## 📋 TO DOS

- Alterar o banco de dados da aplicação. Ao invés de uma tabela para cada papel, utilizar uma tabela user e outra tabela role.
- Adicionar mais cenários de questões
- Analisar se vale a pens mudar do posgree para mysql
- Adicionar TRI as questões
- Ordem das questões deve mudar de acordo como usuário
- Recolher o coeficiente de rendimento e notas em disciplinas de BD do aluno
- Adicionar NoSQL com MongoDB
- Adicionar camadas de proteção e tratamento derros, tanto no fornt quanto no back
- Testes da aplicação com alunos para recolher dados para o TRI

---

## 📜 License

This project is licensed under the Creative Commons BY-NC 4.0 License — see the LICENSE file for details.
