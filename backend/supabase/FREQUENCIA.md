# Atualização de frequência

Antes de usar o cadastro, edição e exclusão de chamadas, execute `frequencia_registros.sql` no **SQL Editor** do projeto Supabase usado pela aplicação. A migração é transacional e pode ser reaplicada. Ela não apaga registros existentes e mantém as políticas RLS atuais.

A atualização cria operações RPC para salvar, editar e excluir a chamada inteira. O cadastro e a mudança de data verificam duplicidade por turma/data dentro da transação, com bloqueio de gravações simultâneas. A edição e a exclusão verificam os IDs, a turma, a data e a versão dos registros carregados; se outra pessoa tiver alterado a chamada, é preciso fechar a janela e abrir novamente o registro atualizado.

Os relatórios continuam lendo `public.frequencias`, com uma linha por aluno. A interface mostra **Ausente**, mas mantém **Falta** no banco. Editar a chamada atualiza data, status, assunto e observações nos mesmos IDs. Professor e data de criação são preservados; campos gerais não alterados mantêm os valores individuais existentes. Registros históricos que usam o ID da turma são agrupados com os que usam seu nome.

Sem a migração, a consulta continua disponível, mas as gravações mostram uma mensagem solicitando a atualização do banco. Não há salvamento alternativo sem proteção contra duplicidade.

## Validação local

Teste de agrupamento e datas, sem dependências adicionais:

```powershell
node --test frontend/tests/frequencia.test.mjs
```

Testes isolados de banco e interface, sem gravações no Supabase real:

```powershell
$frequencyTestDir = Join-Path $env:TEMP 'edukar-frequency-validation'
npm.cmd install --prefix $frequencyTestDir --no-audit --no-fund @electric-sql/pglite @playwright/test
node backend/supabase/tests/frequencia_registros.test.mjs $frequencyTestDir
# Com o servidor local rodando; usa Edge instalado ou BROWSER_PATH.
node frontend/tests/frequencia.browser.mjs $frequencyTestDir
```

O teste de navegador intercepta as requisições REST e usa PostgreSQL em memória. As capturas de desktop, tablet e celular ficam no diretório temporário de testes.

## Atualização de 24/09/2026

Em instalações com a migração anterior, aplique `migrations/20260924000100_frequencia_edicao_conteudo.sql`. O script completo `frequencia_registros.sql` também contém a atualização. Não foi aplicada nenhuma migração ao Supabase remoto durante esta implementação.

Não foi criada constraint UNIQUE(turma, data) em frequencias: essa tabela contém uma linha por aluno, e tal constraint impediria chamadas com vários alunos. As criações pelo aplicativo usam a RPC existente, que bloqueia gravações concorrentes e verifica turma/data antes de inserir a chamada inteira. Essa proteção se aplica às RPCs; inserções SQL/REST diretas externas não têm uma constraint equivalente. Dados históricos não são apagados nem deduplicados automaticamente.

A interface detecta turma/data já carregadas ao selecionar os campos, bloqueia Salvar e oferece Abrir Frequência Existente. Se outra sessão criar a chamada após a consulta, a RPC rejeita a criação e o histórico é recarregado. Relatórios e PDFs continuam consumindo a mesma tabela, sem mudanças em seus arquivos.
