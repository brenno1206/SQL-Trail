# SQL Trail

### Projeto de Iniciação Científica

**Uma abordagem prática para o aprendizado de SQL**

---

## 📌 Sobre o Projeto

O **SQL Trail** é uma aplicação educacional voltada ao ensino prático de SQL por meio da resolução progressiva de desafios com feedback imediato.

A plataforma web simula diferentes cenários de bancos de dados relacionais, permitindo a execução e validação de consultas SQL submetidas pelo usuário, proporcionando uma experiência próxima a situações reais de mercado.

---

## 🏗️ Arquitetura da Aplicação

A aplicação é dividida em frontend, backend e banco de dados:

### 🎨 Frontend

Desenvolvido com:

- React
- TypeScript
- Next.js
- Tailwind CSS

A interface permite que os usuários executem consultas SQL diretamente no navegador, acompanhem seu progresso e recebam feedback imediato.

### ⚙️ Backend

Implementado em:

- Python
- Flask

Responsável por:

- Processar consultas SQL submetidas pelos usuários
- Validar respostas
- Controlar o progresso nos desafios
- Executar verificações adicionais quando necessário

### 🗄️ Banco de Dados

- PostgreSQL (em nuvem)
- Plataforma: Supabase

Os esquemas e dados são previamente definidos para cada conjunto de desafios.  
Essa abordagem permite a execução real das consultas SQL, garantindo resultados consistentes e alinhados a cenários práticos.

---

## 📂 Estrutura dos Desafios

Os desafios são definidos em um arquivo `JSON` carregado durante a inicialização do sistema.

Cada banco de dados simulado:

- Possui uma **slug única**
- Contém um conjunto de questões

Cada questão possui:

- Identificador
- Enunciado
- Consulta SQL considerada correta
- Nível de dificuldade proporcional ao identificador

---

## 🔍 Processo de Validação das Consultas

Após a submissão da consulta pelo usuário, o backend executa as seguintes etapas:

1. Verificação da existência da consulta submetida
2. Validação se a instrução é do tipo `SELECT`
3. Execução da consulta no banco de dados simulado
4. Comparação sintática com a consulta correta (quando necessário)
5. Comparação dos resultados obtidos com os resultados esperados
6. Validação adicional com um modelo de linguagem de grande porte (LLM), caso as verificações anteriores não sejam conclusivas

---

## 🎯 Estrutura de Progressão

Os desafios foram organizados para abranger desde conceitos introdutórios até tópicos avançados da linguagem SQL.

### 🟢 Níveis Iniciais (1–10)

- Consultas básicas
- Cláusulas `FROM` e `WHERE`
- Compreensão do esquema do banco de dados

### 🟡 Níveis Intermediários (11–30)

- `COUNT`
- `ORDER BY`
- `GROUP BY`
- `AVG`
- `DISTINCT`
- `LIMIT`
- `JOIN`
- Condições mais elaboradas na cláusula `WHERE`

### 🔴 Níveis Avançados (31–40)

- Junções múltiplas
- Common Table Expressions (CTE)
- Integração de múltiplos conceitos

---

## 💬 Feedback Imediato

Após cada submissão:

- A instrução SQL é executada
- O sistema informa se a solução está correta

Os bancos simulados abrangem diferentes contextos, como:

- Ambiente acadêmico
- Departamentos de recursos humanos

Isso proporciona variedade de cenários e amplia a experiência prática do estudante.

---

## 🚀 Objetivo

O SQL Trail busca tornar o aprendizado de SQL mais:

- Interativo
- Prático
- Progressivo
- Próximo de situações reais

Promovendo autonomia e reforçando o aprendizado por meio da prática contínua.

## 📜 License

This project is licensed under the Creative Commons BY-NC 4.0 License — see the LICENSE file for details.
