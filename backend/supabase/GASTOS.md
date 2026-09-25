# Gastos

Aba **Gastos** dentro de **Financeiro**, acessível em `/financeiro?aba=gastos`. O endereço antigo `/gastos` redireciona para essa aba. Não utiliza nem modifica as tabelas, cálculos ou relatórios de mensalidades.

## Instalação

Execute `gastos.sql` no SQL Editor do Supabase usado pela aplicação. Para instalações via CLI, a mesma atualização está em `migrations/20260925000100_gastos.sql`. Execute apenas uma das opções. O script pode ser reaplicado e não apaga dados.

A migração cria `public.gastos`, índice por data, validações de descrição/valor/categoria/status, atualização automática de `updated_at`, políticas RLS e permissões CRUD. Mantém o modelo de acesso atual do projeto: `anon` e `authenticated` podem acessar os registros; não adiciona autenticação ou isolamento por escola. Nenhuma política de outras tabelas é alterada.

Se a publicação `supabase_realtime` existir, a tabela é adicionada a ela. O frontend escuta INSERT, UPDATE e DELETE, atualiza a consulta após cada evento e recarrega ao reconectar. Há consulta periódica a cada dez segundos, conforme o padrão React Query do projeto. Os resumos e a lista atualizam imediatamente após salvamentos locais confirmados.

Os cards representam todos os registros; os filtros por mês/ano, categoria e status afetam a tabela. Valor aceita vírgula ou ponto decimal, sem separadores de milhares. Cálculos dos totais usam centavos inteiros. Atualizações e exclusões conferem a versão `updated_at` para detectar edição concorrente.

O formulário não solicita categoria: novos gastos usam o texto da descrição como categoria (ex.: Funcionário). Ao editar a descrição, a categoria também acompanha o novo nome. O filtro lista apenas categorias presentes nos gastos, sem opções fixas e sem repetir textos iguais. Categorias dos registros anteriores são preservadas até que suas descrições sejam editadas. Execute migrations/20260925000300_gastos_categorias_dinamicas.sql no Supabase para remover a restrição de categorias fixas. Essa atualização também está incluída em gastos.sql.

Nenhuma migração foi aplicada ao Supabase remoto durante o desenvolvimento. Sem a tabela, a página apresenta uma orientação para aplicar a migração.

## Verificação

`npm.cmd run build`

`node --test frontend/tests/gastos.test.mjs`

`node backend/supabase/tests/gastos.test.mjs <diretório com @electric-sql/pglite>`

Com o Vite local e `@playwright/test` no diretório de testes:

`node frontend/tests/gastos.browser.mjs <diretório de testes> http://127.0.0.1:5188`

O teste de navegador intercepta as chamadas REST e usa PostgreSQL em memória, sem gravar no banco real. Realtime remoto depende da aplicação da migração no projeto Supabase.

## Recorrência mensal

Para atualizar uma instalação existente, execute migrations/20260925000200_gastos_recorrentes.sql no SQL Editor. O arquivo gastos.sql também inclui essa atualização. Depois execute gastos_recorrentes_cron.sql para habilitar pg_cron e agendar a geração a cada dez minutos. O agendamento usa a data de America/Fortaleza e funciona sem o navegador aberto. Esses scripts ainda precisam ser aplicados no Supabase remoto.

O formulário possui a opção Gasto recorrente (padrão Não). Exemplo: lançamento de 08/09 gera uma nova parcela com data 08/10 e status Pendente a partir de 09/10. Os pagamentos antigos não mudam. Novas parcelas são geradas mesmo quando a anterior ainda está pendente. Os cards existentes continuam somando os registros e os filtros continuam usando a data de cada parcela.

A tabela interna gastos_recorrencias guarda o modelo e o próximo mês. A tabela gastos recebe recorrente, recorrencia_id e competencia. O índice único gastos_recorrencia_mes_unique e o bloqueio transacional da série impedem duplicação. Meses não processados são recuperados; dia 31 usa o último dia do mês curto e volta ao dia 31 nos meses seguintes.

Editar descrição, valor, categoria ou dia de uma parcela também atualiza o modelo das próximas parcelas, sem modificar outras parcelas já existentes. Mudar somente Pago/Pendente não altera o agendamento. Desativar recorrência em qualquer parcela cancela as próximas de toda a série. Reativar retoma a partir do próximo mês, sem cobrar meses de pausa. Excluir uma parcela cancela a série, mas preserva as demais parcelas e o histórico. O diálogo informa esse efeito.

A tabela interna e a função de processamento não são acessíveis a anon/authenticated. As políticas atuais de gastos são preservadas. Para conferir o agendamento: select jobname, schedule, active from cron.job where jobname = 'edukar-gastos-recorrentes';

Teste de recorrência: node backend/supabase/tests/gastos-recorrentes.test.mjs <diretório com @electric-sql/pglite>.

## Exportação de gastos

O botão Baixar relatório de gastos abre a escolha de período mensal (mês e ano) ou geral, e formato Excel (.xlsx) ou PDF. A exportação consulta todos os gastos atualizados e aplica somente o período escolhido, independentemente dos filtros da tabela. Inclui descrição, categoria, valor, data, status, recorrência e resumo pago/pendente/total. Períodos vazios exibem uma mensagem, sem baixar arquivo. Não requer migração nem altera relatórios existentes.
