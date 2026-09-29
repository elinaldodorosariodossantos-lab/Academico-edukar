import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/services/frequenciaRegistros.ts', import.meta.url), 'utf8');
const utils = await readFile(new URL('../src/utils/frequencia.ts', import.meta.url), 'utf8');
const asUrl = (text) => `data:text/javascript;base64,${Buffer.from(ts.transpile(text, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext })).toString('base64')}`;
const moduleSource = source.replace("import { supabase } from '../lib/supabase';", 'const supabase = globalThis.__frequenciaClient;')
  .replace("'../utils/frequencia'", JSON.stringify(asUrl(utils)));
let sequence = 0;
async function setup({ rpcError = { code: 'PGRST202' }, existing = [], lookupError = null, insertError = null } = {}) {
  const calls = [];
  globalThis.__frequenciaClient = {
    rpc: async () => ({ data: [{ id: 'rpc-id' }], error: rpcError }),
    from(table) {
      calls.push(['from', table]);
      const query = {
        select() { return query; },
        eq(...args) { calls.push(['eq', ...args]); return query; },
        in(...args) { calls.push(['in', ...args]); return query; },
        limit() { return Promise.resolve({ data: existing, error: lookupError }); },
        insert(rows) {
          calls.push(['insert', rows]);
          return { select: async () => ({ data: rows.map((row, i) => ({ ...row, id: `id-${i}` })), error: insertError }) };
        },
        then(resolve) { return Promise.resolve({ data: [{ id: 'turma-id', nome: 'Robótica' }], error: null }).then(resolve); },
      };
      return query;
    },
  };
  const { frequenciaRegistros } = await import(`${asUrl(moduleSource)}#${sequence++}`);
  return { service: frequenciaRegistros, calls };
}
const input = [
  { turma: 'turma-id', data: '2026-09-29', aluno: 'Ana', presenca: 'Presente', conteudoMinistrado: 'Sensores', observacoes: 'Participou', professorResponsavel: 'Maria' },
  { turma: 'turma-id', data: '2026-09-29', aluno: 'Bia', presenca: 'Falta' },
];

test('RPC ausente: salva a turma inteira em um lote e devolve os campos do histórico', async () => {
  const { service, calls } = await setup();
  const saved = await service.create(input);
  assert.equal(saved.length, 2);
  assert.equal(saved[0].turma, 'Robótica');
  assert.equal(saved[0].conteudoMinistrado, 'Sensores');
  assert.equal(saved[0].observacoes, 'Participou');
  assert.equal(saved[0].professorResponsavel, 'Maria');
  assert.equal(saved[1].presenca, 'Falta');
  assert.equal(calls.filter(([name]) => name === 'insert').length, 1);
  assert.deepEqual(calls.find(([name]) => name === 'in'), ['in', 'turma', ['turma-id', 'Robótica']]);
});
test('RPC disponível: mantém o caminho transacional', async () => {
  const { service, calls } = await setup({ rpcError: null });
  assert.equal((await service.create(input))[0].id, 'rpc-id');
  assert.deepEqual(calls, []);
});
test('não tenta outra gravação após erro de permissão ou duplicidade na RPC', async () => {
  for (const code of ['42501', '23505']) {
    const { service, calls } = await setup({ rpcError: { code, message: 'Acesso negado' } });
    await assert.rejects(service.create(input));
    assert.deepEqual(calls, []);
  }
});
test('bloqueia duplicidade e falha de consulta sem inserir', async () => {
  for (const options of [{ existing: [{ id: 'existente' }] }, { lookupError: { message: 'Consulta falhou' } }]) {
    const { service, calls } = await setup(options);
    await assert.rejects(service.create(input));
    assert.ok(!calls.some(([name]) => name === 'insert'));
  }
});
test('propaga falha do INSERT sem sinalizar sucesso', async () => {
  const { service } = await setup({ insertError: { message: 'Gravação negada' } });
  await assert.rejects(service.create(input), /Gravação negada/);
});
test('rejeita lista vazia, datas impossíveis e presença não informada', async () => {
  const { service, calls } = await setup();
  for (const rows of [[], [{ ...input[0], data: '2026-02-30' }], [{ ...input[0], presenca: '' }]]) {
    await assert.rejects(service.create(rows));
  }
  assert.deepEqual(calls, []);
});
