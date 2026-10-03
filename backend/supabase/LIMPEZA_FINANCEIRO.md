Análise anterior à limpeza (03/10/2026)

Escopo verificado: imports e usos em frontend/src, rotas em App.tsx, serviços em api.ts, tipos, estilos, migrations, schemas SQL e testes. Não foi consultado o banco remoto: contagens de registros, backups disponíveis e dependências externas não foram verificadas. Nenhum DELETE ou DROP de tabela/campo será executado.

### PODE SER REMOVIDO

Tabela/campo/componente: financeiroPerfilService e financeiroCursoService (api.ts).
Motivo: nenhum consumidor no código atual; usados exclusivamente pelo antigo perfil e preço por curso.
Dependências: seus normalizadores e interfaces FinanceiroPerfil/FinanceiroCurso; nenhuma rota ou hook importa esses serviços.
Impacto: remove consultas/mutations antigas do código, sem alterar banco ou mensalidades.

Tabela/campo/componente: estilos financeiro-profile-*, financeiro-course-value-* e financeiro-modalidade-*.
Motivo: nenhuma classe correspondente nas telas atuais; o novo status Permuta usa o seletor de mensalidades.
Dependências: somente seletores CSS, inclusive variantes escuras.
Impacto: reduz CSS sem alterar controles ativos.

Tabela/campo/componente: Placeholder.tsx e Configuracoes.css.
Motivo: módulo sem importadores ou rota, com configurações fictícias de preços por turma e placeholders de Horários/Relatórios.
Dependências: Configuracoes.css é importado exclusivamente pelo módulo. As páginas reais Horarios.tsx e Relatorios.tsx são carregadas diretamente pelo App.tsx.
Impacto: remove protótipo sem persistência; mantém páginas acadêmicas reais.

### DEVE SER MANTIDO

Tabela/campo/componente: alunos.mensalidade e mensalidade_permuta.
Motivo: fonte oficial do valor e da condição de permuta.
Onde é utilizado: Alunos.tsx, Financeiro.tsx, serviços de alunos e gerar_mensalidades/financeiro_sincronizar_permuta.

Tabela/campo/componente: financeiro_alunos, valor_mensalidade, status_pagamento, data_pagamento, observacoes, boleto_emitido e modalidade.
Motivo: histórico de parcelas/pagamentos e compatibilidade do schema. boleto_emitido/modalidade ainda fazem parte dos INSERTs e do contrato do serviço; não representam emissão de boleto.
Onde é utilizado: financeiroService, Financeiro.tsx, resumoCaixa, geração mensal e migrações. Datas/observações históricas permanecem, mesmo sem colunas visíveis.

Tabela/campo/componente: financeiro_perfis e financeiro_cursos, suas foreign keys, políticas e gatilhos de updated_at.
Motivo: possível histórico e dependência real nas migrations 20261002000100/20261002000200. Quantidade de registros remotos: não verificada.
Onde é utilizado: migração de valores individuais anteriores para alunos.mensalidade; testes de preservação. Não são fontes da geração final após a migration de cadastro/permuta.

Tabela/campo/componente: gastos, observacoes, componentes/hooks/serviços/relatórios de gastos; resumoCaixa.
Motivo: despesas e caixa ativos, calculados a partir das mesmas parcelas/despesas persistidas.
Onde é utilizado: Financeiro.tsx, Gastos.tsx, useGastos, gastosService e relatórios.

Tabela/campo/componente: turmas, alunos, horários, frequências, relatórios, políticas RLS e rotas atuais.
Motivo: funcionalidades acadêmicas e permissões continuam necessárias.
Onde é utilizado: páginas acadêmicas, cadastro, filtros, relatórios e SQL. /gastos é um redirecionamento ativo para /financeiro/gastos; será preservado.

### PRECISA DE MIGRAÇÃO

Tabela/campo: eventual exclusão futura de financeiro_perfis/financeiro_cursos ou dos campos de boleto/modalidade.
Alteração necessária: consultar contagens e histórico no banco real; revisar catálogo de FKs, views, funções, gatilhos e políticas; verificar integrações externas; confirmar backup e preparar rollback; retirar dependências de SQL ativo sem editar migrations já aplicadas.
Dados que serão preservados: valores migrados, todas as parcelas, pagamentos, permutas e despesas. Essa exclusão não está autorizada pela evidência disponível e não faz parte desta limpeza.

### Resultado executado

1. Removidos os dois serviços antigos, seus dois normalizadores, imports e duas interfaces sem consumidores.
2. Mantidos cadastro/mensalidade individual, parcelas, pagamentos, Permuta ativa, indicadores de receita/caixa, Gastos e módulos acadêmicos.
3. Alterados somente código morto e estilos sem uso. Fórmulas, geração mensal e persistência atuais não foram alteradas.
4. Tabelas removidas: nenhuma. Contagens do banco remoto: não verificadas.
5. Campos de banco removidos: nenhum. Tipos removidos: FinanceiroPerfil e FinanceiroCurso.
6. Componentes removidos: módulo Placeholder.tsx (Configurações fictícias e placeholders antigos de Horários/Relatórios) e seu Configuracoes.css. As páginas reais continuam nas rotas atuais.
7. Rotas removidas: nenhuma; não havia rotas atuais de boleto, perfil ou preço por curso. Preservados links antigos e redirecionamento /gastos.
8. Services removidos: financeiroPerfilService (getAll/upsert/upsertMany) e financeiroCursoService (getAll/upsertMany). Nenhuma API remota/tabela foi excluída.
9. Novas migrações nesta limpeza: nenhuma. Migrações anteriores mantidas, necessárias à instalação e ao histórico. Criado auditoria_financeiro.sql somente de leitura, não executado no banco remoto.
10. Dados históricos: nenhuma escrita no banco remoto. Preservados parcelas, valores, status, datas, observações, permutas, tabelas legadas e relacionamentos.
11. Funcionalidades verificadas: cadastro da mensalidade, pagamentos, Permuta/reversão, Gastos/CRUD, caixa compartilhado, filtros, limites de períodos, recarga e navegação.
12. Testes: npm.cmd run build --prefix frontend; sete testes unitários de caixa/gastos; integração PGlite de mensalidades/migrações; mensalidades.browser.mjs, caixa.browser.mjs e financeiro-navigation.browser.mjs. Todos passaram. SQL de auditoria validado no banco local de teste.
13. Validação manual pendente: executar auditoria_financeiro.sql no SQL Editor e verificar contagens, permissões reais, integrações externas e backups. Conferir histórico e valores no ambiente de produção antes de considerar remoções estruturais. Esta limpeza não depende da execução desse SQL.
