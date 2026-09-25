import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(resolve(process.argv[2], 'package.json'));
const { chromium, expect } = require('@playwright/test');
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
await db.exec(await readFile(new URL('../../backend/supabase/gastos.sql', import.meta.url), 'utf8'));
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/rest/v1/**', async route => {
    const req = route.request(), url = new URL(req.url());
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    try {
      if (!url.pathname.endsWith('/gastos')) {
        assert.equal(req.method(), 'GET');
        assert.ok(['alunos', 'turmas', 'financeiro_alunos', 'financeiro_perfis', 'financeiro_cursos'].includes(url.pathname.split('/').pop()));
        return route.fulfill({ status: 200, headers, contentType: 'application/json', body: '[]' });
      }
      let rows;
      const returning = 'returning *, data::text as data, updated_at::text as updated_at';
      if (req.method() === 'GET') rows = (await db.query('select *, data::text as data, updated_at::text as updated_at from gastos order by gastos.data desc, gastos.id')).rows;
      else if (req.method() === 'DELETE') rows = (await db.query('delete from gastos where id=$1 and updated_at=$2 returning id', [url.searchParams.get('id').slice(3), url.searchParams.get('updated_at').slice(3)])).rows;
      else {
        const p = req.postDataJSON(), values = [p.descricao, p.valor, p.data, p.categoria, p.status, p.recorrente ?? false];
        if (req.method() === 'POST') rows = (await db.query(`insert into gastos (descricao,valor,data,categoria,status,recorrente) values ($1,$2,$3,$4,$5,$6) ${returning}`, values)).rows;
        else rows = (await db.query(`update gastos set descricao=$1,valor=$2,data=$3,categoria=$4,status=$5,recorrente=$6 where id=$7 and updated_at=$8 ${returning}`, [...values, url.searchParams.get('id').slice(3), url.searchParams.get('updated_at').slice(3)])).rows;
      }
      rows = rows.map(r => ({ ...r, ...(r.valor !== undefined ? { valor: Number(r.valor) } : {}) }));
      const single = req.headers().accept?.includes('vnd.pgrst.object');
      await route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(single ? rows[0] ?? null : rows) });
    } catch (e) { await route.fulfill({ status: 400, headers, contentType: 'application/json', body: JSON.stringify({ message: e.message }) }); }
  });
  await page.goto(`${process.argv[3] || 'http://127.0.0.1:5188'}/gastos`);
  await expect(page).toHaveURL(/\/financeiro\/gastos$/);
  await expect(page.getByRole('tab', { name: 'Gastos', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Perfil Financeiro', exact: true }).click();
  await expect(page.locator('.financeiro-summary-grid')).toBeVisible();
  await page.getByRole('tab', { name: 'Gastos', exact: true }).click();
  const modal = page.locator('.modal'), table = page.locator('.gastos-table');
  await expect(table).toContainText('Nenhum gasto encontrado');
  for (const [description, value, category, status] of [['Energia', '100,00', 'Energia', 'Pago'], ['Aluguel', '800', 'Aluguel', 'Pendente'], ['Internet', '120', 'Internet', 'Pago']]) {
    await page.getByRole('button', { name: 'Novo Gasto' }).click();
    await modal.getByLabel('Descrição do gasto').fill(description);
    await modal.getByLabel('Valor (R$)').fill(value);
    await modal.getByLabel('Data', { exact: true }).fill('2026-09-25');
    await expect(modal.getByLabel('Categoria')).toHaveCount(0);
    await modal.getByLabel('Status').selectOption(status);
    await expect(modal.getByRole('switch', { name: 'Gasto recorrente' })).toHaveAttribute('aria-checked', 'false');
    if (description === 'Energia') await modal.getByRole('switch', { name: 'Gasto recorrente' }).click();
    await modal.getByRole('button', { name: 'Salvar gasto' }).click();
    await expect(modal).toHaveCount(0);
    await expect(table.locator('tbody tr').filter({ has: page.getByRole('button', { name: `Editar ${description}`, exact: true }) }).locator('td').nth(1)).toHaveText(category);
  }
  assert.equal((await db.query("select recorrente from gastos where descricao='Energia'")).rows[0].recorrente, true);
  await expect(table.locator('tbody tr')).toHaveCount(3);
  await expect(page.locator('.gastos-stat.blue')).toContainText('1.020,00');
  await expect(page.locator('.gastos-stat.green')).toContainText('220,00');
  await expect(page.locator('.gastos-stat.orange')).toContainText('800,00');
  await page.getByRole('button', { name: 'Pagamento de Aluguel', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pagamento de Aluguel', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.gastos-stat.green')).toContainText('1.020,00');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Pagamento de Aluguel', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Pagamento de Aluguel', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pagamento de Aluguel', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.gastos-stat.orange')).toContainText('800,00');
  const filters = page.locator('.gastos-filters');
  await filters.getByLabel('Mês').selectOption('2026-09');
  await filters.getByLabel('Status').selectOption('Pago');
  await expect(table.locator('tbody tr')).toHaveCount(2);
  await filters.getByLabel('Status').selectOption('Pendente');
  await expect(table.locator('tbody tr')).toHaveCount(1);
  await filters.getByLabel('Mês').selectOption(''); await filters.getByLabel('Categoria').selectOption(''); await filters.getByLabel('Status').selectOption('');
  await page.getByRole('button', { name: 'Editar Aluguel', exact: true }).click();
  await modal.getByLabel('Status').selectOption('Pago');
  await modal.getByLabel('Valor (R$)').fill('850,50');
  await modal.getByRole('button', { name: 'Salvar gasto' }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator('.gastos-stat.green')).toContainText('1.070,50');
  await page.getByRole('button', { name: 'Excluir Internet', exact: true }).click();
  await modal.getByRole('button', { name: 'Cancelar' }).click();
  await expect(table.locator('tbody tr')).toHaveCount(3);
  await page.getByRole('button', { name: 'Excluir Internet', exact: true }).click();
  await modal.getByRole('button', { name: 'Excluir gasto', exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(table.locator('tbody tr')).toHaveCount(2);
  await page.reload();
  await expect(table.locator('tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Editar Energia', exact: true }).click();
  await modal.getByLabel('Descrição do gasto').fill('Conta de água de setembro');
  await modal.getByRole('button', { name: 'Salvar gasto' }).click();
  await expect(modal).toHaveCount(0);
  await filters.getByLabel('Categoria').selectOption('Conta de água de setembro');
  await expect(table.locator('tbody tr')).toHaveCount(1);
  await expect(table.locator('tbody tr td').nth(1)).toHaveText('Conta de água de setembro');
  await filters.getByLabel('Mês').selectOption(''); await filters.getByLabel('Categoria').selectOption(''); await filters.getByLabel('Status').selectOption('');
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: resolve(process.argv[2], `gastos-${width}.png`), fullPage: true });
  }
  for (const formato of ['xlsx','pdf']) {
    await page.getByRole('button',{name:'Baixar relatório de gastos',exact:true}).click();
    await modal.getByLabel('Período').selectOption('mensal');
    await modal.getByLabel('Mês',{exact:true}).selectOption('09');
    await modal.getByLabel('Ano',{exact:true}).fill('2026');
    await modal.getByRole('button', { name: formato === 'xlsx' ? 'Excel Planilha .xlsx' : 'PDF Documento .pdf' }).click();
    const downloaded=page.waitForEvent('download');
    await modal.getByRole('button',{name:'Baixar relatório',exact:true}).click();
    const download=await downloaded;
    assert.equal(download.suggestedFilename(),'EdukarXP-gastos-2026-09.'+formato);
    const file=resolve(process.argv[2],download.suggestedFilename());
    await download.saveAs(file);
    if(formato==='xlsx') {
      const {Workbook}=createRequire(new URL('../package.json',import.meta.url))('exceljs');
      const workbook=new Workbook(); await workbook.xlsx.readFile(file);
      const sheet=workbook.getWorksheet('Gastos');
      assert.equal(sheet.getCell('B4').value,950.5);
      assert.equal(sheet.getCell('C8').type,2);
      assert.equal(sheet.getCell('D8').value instanceof Date,true);
      assert.equal(sheet.rowCount,9);
    } else assert.equal((await readFile(file)).subarray(0,4).toString(),'%PDF');
    await expect(modal).toHaveCount(0);
  }
  await page.getByRole('button',{name:'Baixar relatório de gastos',exact:true}).click();
  await modal.getByLabel('Período').selectOption('geral');
  await expect(modal.getByLabel('Ano',{exact:true})).toHaveCount(0);
  const geralDownload=page.waitForEvent('download');
  await modal.getByRole('button',{name:'Baixar relatório',exact:true}).click();
  assert.equal((await geralDownload).suggestedFilename(),'EdukarXP-gastos-geral.xlsx');
  await expect(modal).toHaveCount(0);
  assert.deepEqual(errors, []);
  console.log('OK: cadastro, filtros, totais, edição, confirmação de exclusão, persistência e responsividade.');
} finally { await browser.close(); await db.close(); }
