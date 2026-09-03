# EDUKAR XP — Sistema de Gestão Acadêmica

O **EDUKAR XP** é uma plataforma web para organizar a rotina acadêmica e financeira de escolas e cursos. O sistema reúne alunos, responsáveis, turmas, horários, frequência, relatórios e mensalidades em uma interface moderna, responsiva e com temas claro e escuro.

Todos os dados são armazenados exclusivamente no **Supabase**, que atua como backend e banco de dados da aplicação.

## Funcionalidades

### Dashboard inteligente

- Indicadores atualizados com dados reais de alunos, turmas e frequência
- Aula atual e próxima aula calculadas pelo horário cadastrado
- Percentuais de presença e falta dos alunos
- Cinco atividades recentes baseadas nos horários das turmas
- Calendário e resumo da rotina acadêmica

### Gestão de alunos

- Cadastro, edição, pesquisa e exclusão de alunos
- Data de nascimento obrigatória e CPF opcional
- Identificação do responsável e CPF opcional
- Endereço, bairro, cidade, estado, e-mail e telefone
- Vínculo com turma e situação ativa ou inativa

### Gestão de turmas e horários

- Cadastro de turmas, professores, salas e horários
- Definição dos dias da semana e período de cada aula
- Horário semanal organizado automaticamente a partir das turmas
- Associação dos alunos às respectivas turmas

### Controle de frequência

- Registro de presença e falta por aluno
- Histórico por data e turma
- Conteúdo ministrado e observações da aula
- Cálculo automático dos percentuais de frequência

### Relatórios

- Filtros por mês, ano, aluno e turma
- Pesquisa rápida para localizar alunos
- Resumo prévio dos dados antes da exportação
- Exportação de relatórios em PDF, Word e Excel
- Relatórios individuais, por turma ou gerais conforme os filtros ativos

### Gestão financeira

- Perfil financeiro por aluno com modalidade Boleto ou Permuta
- Configuração em lote por radio buttons
- Valores de mensalidade definidos por turma
- Acompanhamento mensal com status Pago, Pendente ou Permuta
- Indicadores visuais atualizados imediatamente
- Cards de receita prevista, recebida e pendente
- Persistência das configurações e mensalidades no Supabase

## Tecnologias

### Frontend

- React 19
- TypeScript
- Vite
- React Router
- Zustand
- React Icons
- date-fns
- CSS com suporte a temas claro e escuro

### Backend e dados

- Supabase Database
- Cliente `@supabase/supabase-js`
- PostgreSQL
- Row Level Security
- Gatilhos, índices e relacionamentos definidos em SQL

### Relatórios

- jsPDF
- jsPDF AutoTable
- Exportação para Word e Excel

## Estrutura principal

```text
EDUKAR-XP/
├── frontend/
│   ├── src/
│   │   ├── components/   Componentes e páginas
│   │   ├── hooks/        Hooks dos módulos acadêmicos
│   │   ├── lib/          Configuração do Supabase
│   │   ├── services/     Operações de leitura e persistência
│   │   └── types/        Tipos TypeScript
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
└── backend/
    └── supabase/
        ├── schema.sql        Estrutura acadêmica
        ├── alunos_dados.sql  Dados complementares dos alunos
        └── financeiro.sql    Estrutura financeira
```

## Instalação

### Pré-requisitos

- Node.js 20 ou superior
- npm
- Projeto criado no Supabase

### 1. Instale as dependências

```bash
npm install
npm run install:frontend
```

### 2. Configure o ambiente

Copie `.env.example` para `.env` e informe as credenciais públicas do seu projeto:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANONIMA
```

Nunca exponha uma chave `service_role` no frontend.

### 3. Prepare o banco de dados

Execute os scripts abaixo no SQL Editor do Supabase, nesta ordem:

```text
backend/supabase/schema.sql
backend/supabase/alunos_dados.sql
backend/supabase/financeiro.sql
```

### 4. Execute o projeto

```bash
npm run dev
```

### 5. Gere a versão de produção

```bash
npm run build
```

## Scripts disponíveis

- `npm run dev` — inicia o ambiente de desenvolvimento
- `npm run build` — verifica o TypeScript e gera a aplicação de produção
- `npm run preview` — visualiza localmente a versão de produção
- `npm run install:frontend` — instala as dependências da aplicação

Esses comandos podem ser executados diretamente na raiz do projeto e são encaminhados automaticamente para a pasta `frontend`.

## Segurança

- O arquivo `.env` não é versionado
- Apenas a chave pública/anon do Supabase deve ser utilizada no frontend
- O acesso às tabelas é controlado pelas políticas de Row Level Security
- Validações e restrições de integridade também são aplicadas pelo PostgreSQL

## Persistência

O cliente Supabase é inicializado em `frontend/src/lib/supabase.ts`. As operações acadêmicas e financeiras estão centralizadas em `frontend/src/services/api.ts`, garantindo uma única camada de acesso aos dados.

## Documentação adicional

- [Guia de instalação](INSTALLATION.md)
- [Resumo técnico](RESUMO.md)
- [Documentação do React](https://react.dev/)
- [Documentação do Vite](https://vite.dev/)
- [Documentação do Supabase](https://supabase.com/docs)

## Licença

Consulte o arquivo [LICENSE](LICENSE) para conhecer os termos de uso do projeto.

---

Desenvolvido para tornar a gestão acadêmica mais simples, organizada e eficiente.
