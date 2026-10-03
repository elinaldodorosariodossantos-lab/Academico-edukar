Aplicar `migrations/20261003000100_frequencia_aluno_identidade.sql` no SQL Editor do Supabase. A migração não foi executada no banco remoto durante esta implementação.

As frequências passam a guardar `aluno_id`, mantendo os nomes legados e todos os demais dados. Novas chamadas enviam o ID do cadastro. Alterações posteriores de nome atualizam as frequências vinculadas e o nome nos registros financeiros, preservando valores, pagamentos, datas, presenças, conteúdos e observações. A exclusão de um cadastro mantém suas frequências.

A migração associa registros antigos somente quando o nome e a turma identificam um único cadastro. A correção confirmada pelo usuário associa “Miguel” a “João Miguel Pereira Ribeiro” exclusivamente em Robótica Kids Noite, quando há um único cadastro correspondente. Outros alunos chamados Miguel permanecem intactos. Registros sem vínculo continuam disponíveis no relatório geral.

Verificação: `node frontend/tests/frequencia-identidade.test.mjs CAMINHO_DEPENDENCIAS_PGLITE`. O teste cobre reaplicação, correção de Miguel, alteração posterior do nome, preservação dos dados, turma homônima e criação por ID.
