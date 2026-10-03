import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(resolve(process.argv[2], 'package.json'));
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
const read = path => readFileSync(resolve(path), 'utf8');
try {
  await db.exec(`create table alunos (id uuid primary key default gen_random_uuid(), nome text not null, turma text, status text default 'Ativo');
    create table turmas (id uuid primary key default gen_random_uuid(), nome text);`);
  await db.exec(read('backend/supabase/financeiro.sql').replace('create extension if not exists pgcrypto;', ''));
  await db.exec(`insert into alunos (nome, turma) values ('Histórico', 'Curso');
    insert into turmas (nome) values ('Curso');
    insert into financeiro_cursos (turma_id, turma_nome, valor_mensalidade) select id, nome, 200 from turmas;
    insert into financeiro_alunos (aluno_id, aluno_nome, valor_mensalidade, mes_referencia, ano_referencia, status_pagamento)
      select id, nome, 150, 9, 2025, 'Permuta' from alunos;`);
  const before = (await db.query('select * from financeiro_alunos')).rows;
  const migration = read('backend/supabase/migrations/20261002000100_mensalidades_individuais.sql');
  await db.exec(migration);
  await db.exec(migration);
  const after = (await db.query('select * from financeiro_alunos')).rows;
  assert.deepEqual(after.map(({modalidade, data_pagamento, ...row}) => row), before);
  assert.equal((await db.query('select valor_mensalidade, modalidade from financeiro_perfis')).rows[0].valor_mensalidade, '150.00');
  assert.equal((await db.query('select modalidade from financeiro_perfis')).rows[0].modalidade, 'Permuta');
  await db.exec(read('backend/supabase/tests/mensalidades_individuais.sql'));
  await db.exec("select gerar_mensalidades();");
  const current = (await db.query('select * from financeiro_alunos order by id')).rows;
  await db.exec("update financeiro_perfis set modalidade = 'Boleto', valor_mensalidade = 120;");
  // Avança apenas o relógio da função no banco isolado para validar a próxima competência.
  const generation = migration.slice(migration.indexOf('create or replace function public.gerar_mensalidades()'),
    migration.indexOf('-- A data só é registrada'));
  await db.exec(generation.replace("timezone('America/Fortaleza', now())", "(timezone('America/Fortaleza', now()) + interval '1 month')"));
  await db.exec('select gerar_mensalidades(); select gerar_mensalidades();');
  const next = (await db.query(`select * from financeiro_alunos where ano_referencia = extract(year from (timezone('America/Fortaleza', now()) + interval '1 month'))
    and mes_referencia = extract(month from (timezone('America/Fortaleza', now()) + interval '1 month'))`)).rows;
  assert.equal(next.length, 1);
  assert.equal(next[0].valor_mensalidade, '120.00');
  assert.equal(next[0].status_pagamento, 'Pendente');
  assert.equal(next[0].modalidade, 'Boleto');
  assert.deepEqual((await db.query('select * from financeiro_alunos where id = any($1::uuid[]) order by id', [current.map(row => row.id)])).rows, current);
  await db.exec(`insert into alunos (nome, turma) values ('Novo', 'Curso');
    update financeiro_cursos set valor_mensalidade = 300;`);
  assert.equal((await db.query("select valor_mensalidade from financeiro_perfis p join alunos a on a.id = p.aluno_id where a.nome = 'Novo'")).rows[0].valor_mensalidade, '200.00');
  const history = (await db.query('select * from financeiro_alunos order by id')).rows;
  const cadastroMigration = read('backend/supabase/migrations/20261002000200_mensalidade_cadastro_aluno.sql');
  await db.exec(cadastroMigration);
  assert.deepEqual((await db.query('select * from financeiro_alunos order by id')).rows, history);
  await db.exec(`update alunos set mensalidade = 75 where nome = 'Novo';
    update financeiro_perfis set valor_mensalidade = 999, modalidade = 'Permuta';
    update financeiro_cursos set valor_mensalidade = 888;
    insert into alunos (nome, mensalidade) values ('Sem valor', null), ('Zero', 0);`);
  await db.exec('select gerar_mensalidades(); select gerar_mensalidades();');
  const official = (await db.query("select valor_mensalidade, status_pagamento from financeiro_alunos f join alunos a on a.id = f.aluno_id where a.nome = 'Novo'")).rows;
  assert.equal(official.length, 1);
  assert.equal(official[0].valor_mensalidade, '75.00');
  assert.equal(official[0].status_pagamento, 'Pendente');
  assert.equal((await db.query("select count(*) from financeiro_alunos f join alunos a on a.id = f.aluno_id where a.nome = 'Sem valor'")).rows[0].count, 0);
  assert.equal((await db.query("select valor_mensalidade from financeiro_alunos f join alunos a on a.id = f.aluno_id where a.nome = 'Zero'")).rows[0].valor_mensalidade, '0.00');
  await db.exec("update alunos set mensalidade = null where nome = 'Novo';");
  await db.exec(cadastroMigration);
  assert.equal((await db.query("select mensalidade from alunos where nome = 'Novo'")).rows[0].mensalidade, null);
  const officialGeneration = cadastroMigration.slice(cadastroMigration.indexOf('create or replace function public.gerar_mensalidades()'), cadastroMigration.indexOf('-- O campo legado'));
  await db.exec("update alunos set mensalidade = 90 where nome = 'Novo';");
  await db.exec(officialGeneration.replace("timezone('America/Fortaleza', now())", "(timezone('America/Fortaleza', now()) + interval '2 months')"));
  await db.exec('select gerar_mensalidades(); select gerar_mensalidades();');
  const values = (await db.query("select valor_mensalidade from financeiro_alunos f join alunos a on a.id = f.aluno_id where a.nome = 'Novo' order by ano_referencia, mes_referencia")).rows;
  assert.deepEqual(values.map(row => row.valor_mensalidade), ['75.00', '90.00']);
  for (const original of history) assert.deepEqual((await db.query('select * from financeiro_alunos where id = $1', [original.id])).rows[0], original);
  const permutaMigration = read('backend/supabase/migrations/20261002000300_mensalidade_permuta.sql');
  await db.exec(permutaMigration);
  await db.exec(permutaMigration);
  await db.exec(`update financeiro_alunos set status_pagamento = 'Permuta' where aluno_id = (select id from alunos where nome = 'Novo')
    and ano_referencia = extract(year from timezone('America/Fortaleza', now())) and mes_referencia = extract(month from timezone('America/Fortaleza', now()));`);
  assert.deepEqual((await db.query("select mensalidade, mensalidade_permuta from alunos where nome = 'Novo'")).rows[0], { mensalidade: '0.00', mensalidade_permuta: true });
  const permutaGeneration = permutaMigration.slice(permutaMigration.indexOf('create or replace function public.gerar_mensalidades()'), permutaMigration.indexOf("notify pgrst"));
  await db.exec(permutaGeneration.replace("timezone('America/Fortaleza', now())", "(timezone('America/Fortaleza', now()) + interval '3 months')"));
  await db.exec('select gerar_mensalidades(); select gerar_mensalidades();');
  let latest = (await db.query("select valor_mensalidade, status_pagamento from financeiro_alunos f join alunos a on a.id = f.aluno_id where a.nome = 'Novo' order by ano_referencia desc, mes_referencia desc limit 1")).rows[0];
  assert.deepEqual(latest, { valor_mensalidade: '0.00', status_pagamento: 'Permuta' });
  await db.exec(`update alunos set mensalidade = 175 where nome = 'Novo';
    update financeiro_alunos set status_pagamento = 'Pendente', valor_mensalidade = 175 where aluno_id = (select id from alunos where nome = 'Novo')
    and ano_referencia = extract(year from timezone('America/Fortaleza', now())) and mes_referencia = extract(month from timezone('America/Fortaleza', now()));`);
  assert.equal((await db.query("select mensalidade_permuta from alunos where nome = 'Novo'")).rows[0].mensalidade_permuta, false);
  await db.exec(permutaGeneration.replace("timezone('America/Fortaleza', now())", "(timezone('America/Fortaleza', now()) + interval '4 months')"));
  await db.exec('select gerar_mensalidades();');
  latest = (await db.query("select valor_mensalidade, status_pagamento from financeiro_alunos f join alunos a on a.id = f.aluno_id where a.nome = 'Novo' order by ano_referencia desc, mes_referencia desc limit 1")).rows[0];
  assert.deepEqual(latest, { valor_mensalidade: '175.00', status_pagamento: 'Pendente' });
  console.log('OK: migrações, histórico, valores individuais, permuta zero persistente e retorno ao pagamento.');
} finally {
  await db.close();
}
