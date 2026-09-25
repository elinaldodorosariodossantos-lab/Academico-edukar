// node backend/supabase/tests/frequencia_registros.test.mjs <diretório com @electric-sql/pglite instalado>
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(resolve(process.argv[2], 'package.json'));
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
try {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  await db.exec(schema.replace('create extension if not exists pgcrypto;', ''));
  const migration = await readFile(new URL('../frequencia_registros.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  await db.exec(migration); // a migração pode ser reaplicada
  await db.exec(await readFile(new URL('../migrations/20260924000100_frequencia_edicao_conteudo.sql', import.meta.url), 'utf8'));
  const turmaId = '11111111-1111-4111-8111-111111111111';
  await db.query('insert into turmas (id, nome) values ($1, $2)', [turmaId, 'Robótica']);
  // O mesmo nível de acesso à tabela usado pela aplicação, sem SECURITY DEFINER.
  await db.exec('create role frequency_test; grant usage on schema public to frequency_test; grant select, insert, update, delete on frequencias to frequency_test; grant select on turmas to frequency_test; set role frequency_test;');
  const payload = [
    { aluno: 'Ana', presenca: 'Presente', conteudo_ministrado: 'Sensores', observacoes: 'Participou', professor_responsavel: 'Professor' },
    { aluno: 'Bia', presenca: 'Falta', conteudo_ministrado: 'Sensores', observacoes: 'Justificada', professor_responsavel: 'Professor' },
  ];
  const create = (data, turma = 'Robótica', rows = payload) => db.query('select * from criar_registro_frequencia($1, $2, $3::jsonb)', [turma, data, JSON.stringify(rows)]);
  const snapshot = (rows) => rows.map((r) => ({ id: r.id, turma: r.turma, data: r.data, updated_at: r.updated_at, presenca: r.presenca }));
  const edit = (data, rows) => db.query('select * from editar_registro_frequencia($1, $2::jsonb)', [data, JSON.stringify(rows)]);
  const remove = (rows) => db.query('select * from excluir_registro_frequencia($1::jsonb)', [JSON.stringify(rows)]);
  const first = (await create('2026-09-09')).rows;
  assert.equal(first.length, 2);
  await assert.rejects(create('2026-09-09'), /Já existe um registro de frequência/);
  await assert.rejects(create('2026-09-09', turmaId), /Já existe um registro de frequência/);
  const editedContent = (await edit('2026-09-09', snapshot(first).map(r => ({ ...r, conteudo_ministrado: 'Motores', observacoes: '' })))).rows;
  assert.deepEqual(editedContent.map(r => r.id).sort(), first.map(r => r.id).sort());
  assert.ok(editedContent.every(r => r.conteudo_ministrado === 'Motores' && r.observacoes === ''));
  const restored = (await edit('2026-09-09', snapshot(editedContent).map(r => ({ ...r, conteudo_ministrado: 'Sensores', observacoes: first.find(f => f.id === r.id).observacoes })))).rows;
  first.splice(0, first.length, ...restored);
  await create('2026-09-10');
  await assert.rejects(edit('2026-09-10', snapshot(first)), /Já existe um registro de frequência/);
  await assert.rejects(edit('2026-09-11', snapshot(first).slice(0, 1)), /alterada ou removida/);
  const changed = (await edit('2026-09-11', snapshot(first).map((r) => ({ ...r, presenca: 'Presente' })))).rows;
  assert.equal(changed.length, 2);
  assert.ok(changed.every((r) => r.data === '2026-09-11' && r.presenca === 'Presente' && r.conteudo_ministrado === 'Sensores'));
  assert.deepEqual(changed.map((r) => r.observacoes).sort(), ['Justificada', 'Participou']);
  assert.deepEqual(changed.map((r) => r.id).sort(), first.map((r) => r.id).sort());
  await assert.rejects(edit('2026-09-12', snapshot(first)), /alterada ou removida/);
  await assert.rejects(remove(snapshot(first)), /alterada ou removida/);
  await assert.rejects(create('2026-02-30'), /date|range/i);
  await assert.rejects(create('2026-09-12', 'Robótica', [{ aluno: 'Ana', presenca: '' }]), /status/);
  await assert.rejects(create('2026-09-12', 'Robótica', []), /alunos/);
  assert.equal((await remove(snapshot(changed))).rows.length, 2);
  assert.equal((await db.query('select count(*)::int as count from frequencias')).rows[0].count, 2);
  await create('2026-09-11'); // pode recriar após exclusão
  // Duas solicitações para o mesmo destino: somente uma grava a turma inteira.
  const race = await Promise.allSettled([create('2026-09-15'), create('2026-09-15')]);
  assert.equal(race.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal((await db.query("select count(*)::int as count from frequencias where data = '2026-09-15'")).rows[0].count, 2);
  console.log('OK: migração idempotente, RLS, criação completa, duplicidade, alias de turma, edição atômica, preservação dos relatórios, conflito de versão, validação de data/status/lista, exclusão e recriação.');
} finally { await db.close(); }
