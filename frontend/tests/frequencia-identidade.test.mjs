import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(resolve(process.argv[2], 'package.json'));
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
try {
  await db.exec(`
    create table alunos(id uuid primary key, nome text, turma text);
    create table turmas(id uuid primary key, nome text);
    create table financeiro_alunos(aluno_id uuid, aluno_nome text, valor_mensalidade numeric, status_pagamento text);
    create table frequencias(id uuid primary key default gen_random_uuid(), turma text, data text, aluno text,
      presenca text, conteudo_ministrado text, observacoes text, professor_responsavel text,
      created_at timestamptz default now(), updated_at timestamptz default now());
    insert into alunos values ('00000000-0000-0000-0000-000000000001','João Miguel Pereira Ribeiro','Robótica Kids Noite');
    insert into frequencias(turma,data,aluno,presenca,conteudo_ministrado,observacoes)
      values ('Robótica Kids Noite','2026-09-15','Miguel','Presente','Robôs','Preservar'),
        ('Outra turma','2026-09-15','Miguel','Falta','Outro','Preservar também');
    insert into financeiro_alunos values ('00000000-0000-0000-0000-000000000001','João Miguel Pereira Ribeiro',150,'Pago');
  `);
  await db.exec(readFileSync('backend/supabase/frequencia_registros.sql', 'utf8'));
  const migration = readFileSync('backend/supabase/migrations/20261003000100_frequencia_aluno_identidade.sql', 'utf8');
  await db.exec(migration);
  await db.exec(migration);
  let rows = (await db.query('select aluno,aluno_id,data,presenca,conteudo_ministrado,observacoes from frequencias order by turma')).rows;
  assert.equal(rows[0].aluno, 'Miguel');
  assert.equal(rows[0].aluno_id, null);
  assert.equal(rows[1].aluno, 'João Miguel Pereira Ribeiro');
  assert.equal(rows[1].aluno_id, '00000000-0000-0000-0000-000000000001');
  const snapshot = rows[1];
  await db.exec("update alunos set nome='João Miguel Pereira Ribeiro Silva' where id='00000000-0000-0000-0000-000000000001'");
  rows = (await db.query('select aluno,aluno_id,data,presenca,conteudo_ministrado,observacoes from frequencias order by turma')).rows;
  assert.deepEqual(rows[1], { ...snapshot, aluno: 'João Miguel Pereira Ribeiro Silva' });
  assert.deepEqual((await db.query('select aluno_nome,valor_mensalidade,status_pagamento from financeiro_alunos')).rows[0], {
    aluno_nome: 'João Miguel Pereira Ribeiro Silva', valor_mensalidade: '150', status_pagamento: 'Pago',
  });
  await db.query("select * from criar_registro_frequencia($1,$2,$3::jsonb)", ['Robótica Kids Noite', '2026-10-03', JSON.stringify([
    { aluno_id: snapshot.aluno_id, aluno: 'Nome desatualizado', presenca: 'Falta' },
  ])]);
  assert.equal((await db.query("select aluno from frequencias where data='2026-10-03'")).rows[0].aluno, 'João Miguel Pereira Ribeiro Silva');
  console.log('OK: nome corrigido, vínculo por ID, alteração posterior, histórico preservado e turma homônima intacta.');
} finally { await db.close(); }
