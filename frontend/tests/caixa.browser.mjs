import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(resolve(process.argv[2], 'package.json'));
const { chromium, expect } = require('@playwright/test');
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
await db.exec(readFileSync('backend/supabase/gastos.sql', 'utf8'));
await db.exec("insert into gastos (descricao,valor,data,categoria,status) values ('Internet',100,'2026-10-02','Internet','Pago'), ('Material',80,'2026-10-02','Material','Pago'), ('Energia',120,'2026-10-02','Energia','Pendente');");
const despesasOriginais = (await db.query('select id, descricao, valor, status from gastos order by id')).rows;
await db.exec(readFileSync('backend/supabase/migrations/20261002000400_gastos_observacoes.sql', 'utf8'));
await db.exec(readFileSync('backend/supabase/migrations/20261002000400_gastos_observacoes.sql', 'utf8'));
assert.deepEqual((await db.query('select id, descricao, valor, status from gastos order by id')).rows, despesasOriginais);
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  const page = await browser.newPage();
  const now = new Date();
  const receitas = [600, 400, 180, 0].map((valor, i) => ({ id: `parcela-${i}`, aluno_id: `aluno-${i}`, aluno_nome: `Aluno ${i}`, curso: 'Curso', turma: 'Curso', valor_mensalidade: valor, mes_referencia: i === 1 ? (now.getMonth() + 11) % 12 + 1 : now.getMonth() + 1, ano_referencia: i === 1 && now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(), status_pagamento: i < 2 ? 'Pago' : i === 2 ? 'Pendente' : 'Permuta' }));
  const original = structuredClone(receitas);
  await page.route('**/rest/v1/**', async route => {
    const req = route.request(), url = new URL(req.url()), table = url.pathname.split('/').pop();
    if (table !== 'gastos') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(table === 'financeiro_alunos' ? receitas : table === 'gerar_mensalidades' ? 0 : []) });
    try {
      let rows;
      const ret = 'returning *, data::text as data, updated_at::text as updated_at';
      if (req.method() === 'GET') rows = (await db.query('select *, data::text as data, updated_at::text as updated_at from gastos order by id')).rows;
      else if (req.method() === 'DELETE') rows = (await db.query('delete from gastos where id=$1 and updated_at=$2 returning id', [url.searchParams.get('id').slice(3), url.searchParams.get('updated_at').slice(3)])).rows;
      else {
        const p = req.postDataJSON(), values = [p.descricao, p.valor, p.data, p.categoria, p.status, p.observacoes ?? '', p.recorrente ?? false];
        rows = req.method() === 'POST'
          ? (await db.query(`insert into gastos (descricao,valor,data,categoria,status,observacoes,recorrente) values ($1,$2,$3,$4,$5,$6,$7) ${ret}`, values)).rows
          : (await db.query(`update gastos set descricao=$1,valor=$2,data=$3,categoria=$4,status=$5,observacoes=$6,recorrente=$7 where id=$8 and updated_at=$9 ${ret}`, [...values, url.searchParams.get('id').slice(3), url.searchParams.get('updated_at').slice(3)])).rows;
      }
      rows = rows.map(r => ({ ...r, ...(r.valor === undefined ? {} : { valor: Number(r.valor) }) }));
      const single = req.headers().accept?.includes('vnd.pgrst.object');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? rows[0] ?? null : rows) });
    } catch (error) { await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: error.message }) }); }
  });
  const card = label => page.locator('.financeiro-stat-card').filter({ has: page.getByText(label, { exact: true }) }).locator('strong');
  const main = async (caixa, total, pago, pendente) => {
    await page.getByRole('tab', { name: 'Mensalidades', exact: true }).click();
    await expect(card('Receita recebida acumulada')).toHaveCount(0);
    await expect(card('Receita recebida')).toHaveText(/600,00/);
    for (const [label, value] of [['Dinheiro em caixa', caixa], ['Total de Gastos', total], ['Total de gastos pagos', pago], ['Total de gastos pendentes', pendente]]) await expect(card(label)).toHaveText(new RegExp(value.replace('.', '\\.')));
  };
  const gastos = async () => {
    await page.evaluate(() => { window.painelFinanceiro ??= document.querySelector('.financeiro-summary-grid'); });
    await page.getByRole('tab', { name: 'Gastos', exact: true }).click();
    await expect(page.locator('.financeiro-summary-grid')).toHaveCount(1);
    await expect(page.locator('.financeiro-summary-grid')).toBeVisible();
    await expect(page.locator('.gastos-summary')).toHaveCount(0);
    assert.equal(await page.evaluate(() => window.painelFinanceiro === document.querySelector('.financeiro-summary-grid')), true);
  };
  await page.goto((process.argv[3] || 'http://127.0.0.1:5188') + '/financeiro/mensalidades');
  await main('420,00', '300,00', '180,00', '120,00');
  await page.evaluate(() => { window.painelFinanceiro = document.querySelector('.financeiro-summary-grid'); });
  await gastos();
  await page.getByRole('button', { name: 'Pagamento de Energia', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pagamento de Energia', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(card('Dinheiro em caixa')).toHaveText(/300,00/);
  await expect(card('Total de gastos pagos')).toHaveText(/300,00/);
  await expect(card('Receita recebida')).toHaveText(/600,00/);
  await main('300,00', '300,00', '300,00', '0,00');
  assert.equal((await db.query('select count(*) from gastos')).rows[0].count, 3);

  await gastos();
  await page.getByRole('button', { name: 'Editar Material', exact: true }).click();
  await page.getByLabel('Valor (R$)', { exact: true }).fill('100,00');
  await page.getByLabel('Observação', { exact: true }).fill('Compra confirmada');
  await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
  await expect(page.locator('.modal')).toHaveCount(0);
  await main('280,00', '320,00', '320,00', '0,00');
  assert.equal((await db.query("select observacoes from gastos where descricao='Material'")).rows[0].observacoes, 'Compra confirmada');
  await gastos();
  await page.getByRole('button', { name: 'Excluir Material', exact: true }).click();
  await page.getByRole('button', { name: 'Excluir gasto', exact: true }).click();
  await expect(page.locator('.modal')).toHaveCount(0);
  await main('380,00', '220,00', '220,00', '0,00');
  await gastos();
  await page.getByRole('button', { name: 'Novo Gasto', exact: true }).click();
  await page.getByLabel('Descrição do gasto').fill('Novo material');
  await page.getByLabel('Valor (R$)', { exact: true }).fill('80,00');
  await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
  await expect(page.locator('.modal')).toHaveCount(0);
  await main('380,00', '300,00', '220,00', '80,00');
  await gastos();
  await page.getByRole('button', { name: 'Pagamento de Novo material', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pagamento de Novo material', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await main('300,00', '300,00', '300,00', '0,00');
  await page.locator('.financeiro-filters select').nth(3).selectOption('Pendente');
  await expect(card('Receita recebida')).toHaveText(/600,00/);
  await expect(card('Dinheiro em caixa')).toHaveText(/300,00/);
  await page.reload();
  await expect(card('Dinheiro em caixa')).toHaveText(/300,00/);
  assert.deepEqual(receitas, original);
  assert.equal((await db.query('select count(*) from gastos')).rows[0].count, 3);
  await gastos();
  await page.locator('.gastos-filters select').first().selectOption('2026-08');
  for (const label of ['Receita recebida', 'Total de Gastos', 'Total de gastos pagos', 'Total de gastos pendentes', 'Dinheiro em caixa']) await expect(card(label)).toHaveText(/0,00/);
  await expect(page.locator('.gastos-table')).toContainText('Sem registros neste período');
  await expect(page.getByRole('button', { name: 'Novo Gasto', exact: true })).toBeDisabled();
  await page.locator('.gastos-filters select').first().selectOption('2026-09');
  for (const label of ['Total de Gastos', 'Total de gastos pagos', 'Total de gastos pendentes']) await expect(card(label)).toHaveText(/0,00/);
  await expect(card('Dinheiro em caixa')).toHaveText(await card('Receita recebida').textContent());
  await expect(page.getByRole('button', { name: 'Novo Gasto', exact: true })).toBeDisabled();
  await page.locator('.gastos-filters select').first().selectOption('2026-10');
  await expect(card('Total de Gastos')).toHaveText(/300,00/);
  await expect(page.getByRole('button', { name: 'Novo Gasto', exact: true })).toBeEnabled();
  console.log('OK: caixa acumulado, pagamento, edição, exclusão, cadastro pendente, observação, recarga e receita preservada.');
} finally { await browser.close(); await db.close(); }
