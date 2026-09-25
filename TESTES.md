# Ambiente de testes sem Docker/WSL

Este modo executa o frontend no computador e utiliza um projeto Supabase na nuvem exclusivo para testes. Ele não instala componentes no Windows e preserva o arquivo `frontend/.env` atual.

## Preparar o projeto de testes

1. No painel Supabase, crie um projeto separado (por exemplo, `edukar-xp-testes`).
2. No SQL Editor **desse projeto novo**, execute, nesta ordem:
   - `backend/supabase/schema.sql`
   - `backend/supabase/alunos_dados.sql`
   - `backend/supabase/financeiro.sql`
   - `backend/supabase/frequencia_registros.sql`
3. Copie a URL do projeto e sua chave pública (publishable ou anon). Não use uma chave secret/service_role.
4. Preencha `frontend/.env.testing.local`, criando o arquivo se necessário:

```dotenv
SUPABASE_TEST_URL=https://REFERENCIA-DO-PROJETO.supabase.co
SUPABASE_TEST_PUBLIC_KEY=CHAVE_PUBLICA_DO_PROJETO_DE_TESTES
```

Esse arquivo não é versionado. Cadastre dados fictícios no banco novo para testar.

## Iniciar

Na raiz do projeto:

```powershell
npm.cmd run dev:teste
```

Abra http://127.0.0.1:5177. A aba do navegador identifica o ambiente como **Edukar XP — TESTES**.

O comando bloqueia a inicialização se os dados de testes estiverem vazios, se a chave for secreta ou se a URL apontar para o mesmo projeto Supabase configurado no ambiente atual. Ele não usa as credenciais atuais como alternativa.

`Ctrl+C` encerra o ambiente de testes. O comando original `npm.cmd run dev` continua usando a configuração atual. `dev:local` é outra opção, que depende de Docker/WSL e não é necessária neste fluxo.

## Verificar a separação das configurações

```powershell
node --test scripts/testing-config.test.mjs
```
