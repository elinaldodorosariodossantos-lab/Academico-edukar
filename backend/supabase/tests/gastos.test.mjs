import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(resolve(process.argv[2], 'package.json'));
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
try {
  const sql = await readFile(new URL('../gastos.sql', import.meta.url), 'utf8');
  await db.exec(sql); await db.exec(sql);
  await db.exec('create role gastos_test; grant usage on schema public to gastos_test; grant select, insert, update, delete on gastos to gastos_test; set role gastos_test');
  const create = (valor, categoria = 'Energia', status = 'Pago') => db.query("insert into gastos (descricao, valor, data, categoria, status) values ('Energia', $1, '2026-09-25', $2, $3) returning *, updated_at::text as updated_at", [valor, categoria, status]);
  const first = (await create(100)).rows[0];
  await create(800, 'Aluguel', 'Pendente'); await create(120, 'Internet');
  assert.equal(Number((await db.query('select sum(valor) as total from gastos')).rows[0].total), 1020);
  await assert.rejects(create(-1)); await assert.rejects(create(0)); await assert.rejects(create(10, '')); await assert.rejects(create(10, 'Energia', 'Inválido'));
  const changed = (await db.query("update gastos set valor=150, status='Pendente' where id=$1 and updated_at=$2 returning *, updated_at::text as updated_at", [first.id, first.updated_at])).rows[0];
  assert.equal(changed.id, first.id);
  assert.notEqual(String(changed.updated_at), String(first.updated_at));
  assert.equal((await db.query('delete from gastos where id=$1 and updated_at=$2 returning id', [first.id, first.updated_at])).rows.length, 0);
  assert.equal((await db.query('delete from gastos where id=$1 and updated_at=$2 returning id', [changed.id, changed.updated_at])).rows.length, 1);
  await create(50, 'Funcionário');
  console.log('OK: migração idempotente, RLS, CRUD, totais, validação e conflito de versão.');
} finally { await db.close(); }
