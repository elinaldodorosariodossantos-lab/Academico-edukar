# Resumo técnico — EDUKAR XP

## Arquitetura

- Interface: React, TypeScript e Vite
- Backend e persistência: Supabase Database
- Cliente de dados: `@supabase/supabase-js`
- Esquema: scripts SQL versionados em `backend/supabase/`
- Relatórios: geração local em PDF, Word e Excel

## Organização principal

```text
frontend/
  src/
    components/     Interface e páginas
    hooks/          Estado e operações dos módulos
    lib/            Inicialização do cliente Supabase
    services/       Acesso centralizado aos dados
    types/          Tipos TypeScript
backend/
  supabase/
    schema.sql       Estrutura acadêmica principal
    alunos_dados.sql Dados complementares de alunos
    financeiro.sql   Estrutura do módulo financeiro
```

## Dados

As funcionalidades acadêmicas e financeiras utilizam somente o Supabase para leitura e persistência. O arquivo `frontend/src/services/api.ts` concentra as consultas, inclusões, alterações e exclusões realizadas pelo frontend.

## Ambiente

Variáveis necessárias:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANONIMA
```

O arquivo `.env` contém os valores locais e não deve ser enviado ao repositório.

## Validação

Na raiz do projeto, use `npm run build` para executar a verificação do TypeScript e gerar a aplicação de produção. O comando é encaminhado automaticamente para `frontend`.
