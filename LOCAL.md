# Frontend e backend locais

O projeto pode usar React/Vite e Supabase inteiramente neste computador. O Supabase local fornece PostgreSQL, API REST, funções SQL e Studio em contêineres Docker. O banco começa vazio; ele não copia os dados da nuvem.

## Preparação do Windows (uma vez)

1. Instale o WSL 2 e o Docker Desktop com o backend WSL 2. Pode ser necessário usar uma conta de administrador e reiniciar o Windows.
2. Abra o Docker Desktop, conclua a configuração inicial e aguarde o motor Docker ficar pronto.
3. Na raiz deste projeto, execute:

```powershell
npm.cmd install
npm.cmd run install:frontend
```

Referências oficiais: [Supabase local](https://supabase.com/docs/guides/local-development/cli/getting-started) e [Docker Desktop no Windows](https://docs.docker.com/desktop/setup/install/windows-install/).

## Iniciar os dois

```powershell
npm.cmd run dev:local
```

O comando verifica o Docker, inicia o Supabase, aplica as migrações locais pendentes e inicia o frontend com o endereço e a chave pública retornados pelo backend. O primeiro início baixa as imagens e pode levar vários minutos.

| Serviço | Endereço |
| --- | --- |
| Frontend com banco local | http://127.0.0.1:5176 |
| API do backend local | http://127.0.0.1:54321 |
| Supabase Studio local | http://127.0.0.1:54323 |
| PostgreSQL local | 127.0.0.1:54322 |

A porta 5176 distingue este ambiente do frontend que já usa a nuvem em 5173. O `.env` existente fica preservado; as variáveis locais são passadas somente ao processo iniciado pelo comando. O frontend aceita HTTP apenas em endereços de loopback, além das conexões HTTPS já suportadas.

Cadastre uma turma e alunos fictícios, depois abra **Frequência → Nova Frequência**. As funções de frequência são instaladas pelas migrações, sem precisar colar SQL manualmente. Os dados locais permanecem salvos ao parar e iniciar os serviços.

## Parar

Use `Ctrl+C` no terminal para encerrar o frontend. Para parar o backend mantendo os dados:

```powershell
npm.cmd run local:stop
```

`npm.cmd run dev` continua iniciando o frontend com o `.env` atual e o Supabase na nuvem.

## Banco e migrações

A configuração está em `backend/supabase/config.toml`, com o projeto Docker `edukar-xp-local`. As migrações em `backend/supabase/migrations` reproduzem, nesta ordem, os scripts acadêmicos, dados complementares de alunos, financeiro e registros de frequência.

Para futuras alterações de banco, acrescente uma nova migração. Não altere migrações já aplicadas. O comando local usa `migration up --local`; ele não executa reset do banco nem faz deploy na nuvem.

## Se não iniciar

- **Docker não está disponível:** instale e abra o Docker Desktop; aguarde o motor ficar pronto.
- **WSL exige reinicialização:** salve seu trabalho e reinicie o Windows antes de tentar novamente.
- **Porta 5176 ocupada:** encerre a instância anterior deste ambiente. O comando não troca de porta silenciosamente.
- **Falha ao baixar imagens:** confira a conexão com a internet e tente novamente.

Após qualquer erro, o frontend local só inicia quando o backend e as migrações estão prontos.
