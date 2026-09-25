// Dados isolados: todas as requisições REST são interceptadas e executadas no PostgreSQL em memória.
// node frontend/tests/frequencia.browser.mjs <diretório com @playwright/test e @electric-sql/pglite> [URL local]
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(resolve(process.argv[2], 'package.json'));
const { chromium, expect } = require('@playwright/test');
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
const schema = await readFile(new URL('../../backend/supabase/schema.sql', import.meta.url), 'utf8');
await db.exec(schema.replace('create extension if not exists pgcrypto;', ''));
await db.exec(await readFile(new URL('../../backend/supabase/frequencia_registros.sql', import.meta.url), 'utf8'));
await db.exec(`insert into turmas (id, nome, professor) values ('11111111-1111-4111-8111-111111111111', 'Robótica Teste', 'Professor Teste');
  insert into alunos (nome, turma, responsavel, status) values ('Ana Teste', 'Robótica Teste', 'Responsável A', 'Ativo'), ('Bia Teste', 'Robótica Teste', 'Responsável B', 'Ativo');
  insert into frequencias (data, turma, aluno, presenca, conteudo_ministrado) values ('2026-09-09', 'Robótica Teste', 'Ana Teste', 'Presente', 'Sensores'), ('2026-09-09', 'Robótica Teste', 'Bia Teste', 'Falta', 'Sensores');`);
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  const restCalls = [];
  let emptyNextCreation = false;
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const name = url.pathname.split('/').pop();
    restCalls.push(`${route.request().method()} ${name}`);
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS' };
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return; }
    try {
      let rows;
      if (url.pathname.includes('/rpc/')) {
        const p = route.request().postDataJSON();
        if (name === 'criar_registro_frequencia' && emptyNextCreation) {
          emptyNextCreation = false;
          await route.fulfill({ status: 200, headers, contentType: 'application/json', body: '[]' });
          return;
        }
        if (name === 'criar_registro_frequencia') rows = (await db.query('select * from criar_registro_frequencia($1,$2,$3::jsonb)', [p.p_turma, p.p_data, JSON.stringify(p.p_alunos)])).rows;
        else if (name === 'editar_registro_frequencia') rows = (await db.query('select * from editar_registro_frequencia($1,$2::jsonb)', [p.p_data, JSON.stringify(p.p_registros)])).rows;
        else if (name === 'excluir_registro_frequencia') rows = (await db.query('select * from excluir_registro_frequencia($1::jsonb)', [JSON.stringify(p.p_registros)])).rows;
        else throw new Error(`RPC inesperada: ${name}`);
      } else {
        assert.equal(route.request().method(), 'GET');
        assert.ok(['alunos', 'turmas', 'frequencias'].includes(name));
        rows = (await db.query(`select * from ${name}`)).rows;
      }
      await route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(rows) });
    } catch (error) {
      console.log('Erro no mock:', name, error.message);
      await route.fulfill({ status: 400, headers, contentType: 'application/json', body: JSON.stringify({ code: error.code || 'TEST_ERROR', message: error.message }) });
    }
  });
  await page.goto(`${process.argv[3] || 'http://127.0.0.1:5173'}/frequencia`);
  const table = page.locator('.frequency-history-table');
  const modal = page.locator('.modal');
  const setPresence = async (name, status) => {
    const button = modal.getByRole('button', { name: `Presença de ${name}`, exact: true });
    for (let i = 0; i < 2 && await button.getAttribute('data-status') !== status; i++) await button.click();
    await expect(button).toHaveAttribute('data-status', status);
  };
  await expect(table.locator('tbody tr')).toHaveCount(1, { timeout: 20000 }).catch(async (error) => {
    console.log('Tela:', await page.locator('body').innerText());
    console.log('Erros JS:', errors);
    console.log('Chamadas REST:', restCalls);
    console.log('Diagnóstico:', await page.evaluate(async () => {
      try { await (await import('/src/services/api.ts')).frequenciaService.getAll(); return 'OK'; }
      catch (caught) { return caught.message; }
    }));
    throw error;
  });
  await expect(page.getByText('Última Frequência Realizada', { exact: true })).toBeVisible();
  await table.getByRole('button', { name: /Visualizar/ }).click();
  await expect(modal.getByText('Ana Teste', { exact: true })).toBeVisible();
  await expect(modal.getByText('Ausente', { exact: true })).toBeVisible();
  await modal.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.getByRole('button', { name: 'Nova Frequência', exact: true }).click();
  await modal.getByLabel('Turma').selectOption('11111111-1111-4111-8111-111111111111');
  await modal.getByLabel('Data da frequência').fill('2026-09-10');
  await modal.getByRole('button', { name: 'Salvar frequência', exact: true }).click();
  await expect(modal).toBeVisible(); // não salva enquanto houver status obrigatório vazio
  await setPresence('Ana Teste', 'Presente');
  await setPresence('Bia Teste', 'Falta');
  await modal.getByLabel('Assunto da aula').fill('Robôs');
  await modal.getByRole('button', { name: 'Salvar frequência', exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(table.locator('tbody tr')).toHaveCount(2);
  await expect(page.locator('.frequency-latest')).toContainText('10/09/2026');
  await page.getByRole('button', { name: 'Nova Frequência', exact: true }).click();
  await modal.getByLabel('Turma').selectOption('11111111-1111-4111-8111-111111111111');
  await modal.getByLabel('Data da frequência').fill('2026-09-10');
  await setPresence('Ana Teste', 'Presente');
  await setPresence('Bia Teste', 'Presente');
  await expect(modal.getByRole('button', { name: 'Salvar frequência', exact: true })).toBeDisabled();
  await expect(modal.getByRole('alert')).toHaveText('Já existe uma frequência registrada para esta turma nesta data. Utilize a opção de edição para realizar alterações.');
  await modal.getByRole('button', { name: 'Abrir Frequência Existente', exact: true }).click();
  await expect(modal.getByLabel('Assunto da aula')).toHaveValue('Robôs');
  await modal.getByLabel('Assunto da aula').fill('Motores');
  await modal.getByLabel('Observações gerais').fill('Revisado');
  await modal.getByLabel('Data da frequência').fill('2026-09-09');
  await expect(modal.getByRole('button', { name: 'Salvar frequência', exact: true })).toBeDisabled();
  await expect(modal.getByRole('alert')).toContainText('Utilize a opção de edição');
  await modal.getByLabel('Data da frequência').fill('2026-09-11');
  await setPresence('Bia Teste', 'Presente');
  await modal.getByRole('button', { name: 'Salvar frequência', exact: true }).click();
  await expect(modal).toHaveCount(0);
  const updated = (await db.query("select * from frequencias where data = '2026-09-11'")).rows;
  assert.ok(updated.length === 2 && updated.every((row) => row.conteudo_ministrado === 'Motores' && row.observacoes === 'Revisado' && row.presenca === 'Presente'));
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `Sem overflow global em ${width}px`);
    await page.screenshot({ path: resolve(process.argv[2], `frequencia-${width}.png`), fullPage: true, animations: 'disabled' });
  }
  await table.locator('tr').filter({ hasText: '11/09/2026' }).getByRole('button', { name: 'Editar', exact: true }).click();
  await page.screenshot({ path: resolve(process.argv[2], 'frequencia-modal-mobile.png'), fullPage: true, animations: 'disabled' });
  await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await table.locator('tr').filter({ hasText: '11/09/2026' }).getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(modal).toContainText('Tem certeza que deseja excluir esta frequência? Esta ação não poderá ser desfeita.');
  await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(table.locator('tbody tr')).toHaveCount(2);
  await table.locator('tr').filter({ hasText: '11/09/2026' }).getByRole('button', { name: 'Excluir', exact: true }).click();
  await modal.getByRole('button', { name: 'Excluir frequência', exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(table.locator('tbody tr')).toHaveCount(1);
  // Outra sessão salva enquanto o formulário ainda tem um histórico antigo.
  await page.getByRole('button', { name: 'Nova Frequência', exact: true }).click();
  await modal.getByLabel('Turma').selectOption('11111111-1111-4111-8111-111111111111');
  await modal.getByLabel('Data da frequência').fill('2026-09-24');
  await setPresence('Ana Teste', 'Presente');
  await setPresence('Bia Teste', 'Falta');
  const concurrent = (await db.query('select * from criar_registro_frequencia($1,$2,$3::jsonb)', ['Robótica Teste', '2026-09-24', JSON.stringify([
    { aluno: 'Ana Teste', presenca: 'Presente', conteudo_ministrado: 'Outra sessão' },
    { aluno: 'Bia Teste', presenca: 'Falta', conteudo_ministrado: 'Outra sessão' },
  ])])).rows;
  await modal.getByRole('button', { name: 'Salvar frequência', exact: true }).click();
  await expect(modal.getByRole('alert')).toHaveText('Já existe uma frequência registrada para esta turma nesta data. Utilize a opção de edição para realizar alterações.');
  await modal.getByRole('button', { name: 'Abrir Frequência Existente', exact: true }).click();
  await expect(modal.getByLabel('Assunto da aula')).toHaveValue('Outra sessão');
  await modal.getByLabel('Assunto da aula').fill('Corrigido');
  await setPresence('Bia Teste', 'Presente');
  await modal.getByRole('button', { name: 'Salvar frequência', exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator('.frequency-latest')).toContainText('Corrigido');
  const afterConcurrentEdit = (await db.query("select * from frequencias where data = '2026-09-24'")).rows;
  assert.equal(afterConcurrentEdit.length, 2);
  assert.deepEqual(afterConcurrentEdit.map(row => row.id).sort(), concurrent.map(row => row.id).sort());
  assert.ok(afterConcurrentEdit.every(row => row.presenca === 'Presente'));
  await page.getByRole('button', { name: 'Nova Frequência', exact: true }).click();
  await modal.getByLabel('Turma').selectOption('11111111-1111-4111-8111-111111111111');
  await modal.getByLabel('Data da frequência').fill('2026-09-25');
  await setPresence('Ana Teste', 'Presente');
  await setPresence('Bia Teste', 'Falta');
  emptyNextCreation = true;
  await modal.getByRole('button', { name: 'Salvar frequência', exact: true }).click();
  await expect(modal.getByRole('alert')).toContainText('Não foi possível confirmar o salvamento completo');
  await expect(page.locator('.frequency-latest')).toContainText('Corrigido');
  await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.evaluate(() => document.body.classList.add('dark-mode'));
  await page.screenshot({ path: resolve(process.argv[2], 'frequencia-dark-mobile.png'), fullPage: true, animations: 'disabled' });
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('OK: visualizar, criar, status obrigatório, duplicidade na criação e edição, preservar conteúdo, cancelar/confirmar exclusão, desktop/tablet/celular, sem erros JS.');
} finally { await browser.close(); await db.close(); }
