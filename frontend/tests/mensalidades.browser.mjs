import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(resolve(process.argv[2], 'package.json'));
const { chromium, expect } = require('@playwright/test');
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  const page = await browser.newPage();
  const now = new Date();
  const alunos = ['Adam', 'Ana', 'Pedro'].map((nome, i) => ({ id: `00000000-0000-4000-8000-00000000000${i}`, nome, mensalidade: [179, 150, 120][i], turma: 'Curso', status: 'Ativo', data_nascimento: '2010-01-01', data_inicio: '2025-01-01', responsavel: 'Responsável', endereco: 'Rua 1', bairro: 'Centro', cidade: 'Fortaleza', estado: 'CE', email: 'familia@example.com', telefone: '85999999999' }));
  const parcelas = [{ id: 'parcela', aluno_id: alunos[0].id, aluno_nome: 'Adam', curso: 'Curso', turma: 'Curso', valor_mensalidade: 179, mes_referencia: now.getMonth() + 1, ano_referencia: now.getFullYear(), status_pagamento: 'Pendente', modalidade: 'Boleto', boleto_emitido: 'Não' }];
  const perfis = alunos.map((a, i) => ({ aluno_id: a.id, modalidade: i === 2 ? 'Permuta' : 'Boleto', valor_mensalidade: [179, 150, 120][i] }));
  await page.route('**/rest/v1/**', async route => {
    const req = route.request(); const url = new URL(req.url()); const table = url.pathname.split('/').pop();
    if (table === 'financeiro_perfis' || table === 'financeiro_cursos') throw new Error('Consulta indevida ao financeiro legado');
    let data = table === 'alunos' ? alunos : table === 'financeiro_alunos' ? parcelas : table === 'financeiro_perfis' ? perfis : [];
    if (table === 'gerar_mensalidades') data = 0;
    if (table === 'financeiro_alunos' && url.searchParams.has('aluno_id')) data = parcelas.find(p => `eq.${p.aluno_id}` === url.searchParams.get('aluno_id')) ?? null;
    if (req.method() === 'POST' && table === 'financeiro_perfis') {
      data = req.postDataJSON(); for (const p of data) Object.assign(perfis.find(item => item.aluno_id === p.aluno_id), p);
    }
    if (req.method() === 'PATCH' && table === 'alunos') { const item = alunos.find(a => `eq.${a.id}` === url.searchParams.get('id')); Object.assign(item, req.postDataJSON()); data = item; }
    if (req.method() === 'PATCH' && table === 'financeiro_alunos') { Object.assign(parcelas[0], req.postDataJSON()); data = parcelas[0]; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto((process.argv[3] || 'http://127.0.0.1:5188') + '/financeiro/mensalidades');
  await expect(page.locator('table tbody tr')).toHaveCount(3);
  await expect(page.getByRole('tab', { name: 'Perfil Financeiro' })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Gest. Curso' })).toHaveCount(0);
  await expect(page.getByRole('spinbutton', { name: 'Mensalidade de Ana', exact: true })).toHaveValue('150');
  const adam = page.getByRole('row').filter({ hasText: 'Adam' });
  await adam.locator('select').selectOption('Pago');
  await adam.getByRole('button', { name: 'Salvar' }).click();
  await expect(adam.locator('select')).toHaveValue('Pago');
  await page.goto((process.argv[3] || 'http://127.0.0.1:5188') + '/alunos');
  await page.getByRole('button', { name: 'Editar dados de Adam', exact: true }).click();
  await expect(page.getByLabel('Mensalidade (R$)', { exact: true })).toHaveValue('179');
  await page.getByLabel('Mensalidade (R$)', { exact: true }).fill('130');
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
  await expect(page.getByLabel('Mensalidade (R$)', { exact: true })).toHaveCount(0);
  if (alunos[0].mensalidade !== 130 || parcelas[0].valor_mensalidade !== 179 || alunos[1].mensalidade !== 150) throw new Error('Cadastro, histórico ou isolamento incorreto');
  await page.goto((process.argv[3] || 'http://127.0.0.1:5188') + '/financeiro/perfil');
  await expect(page).toHaveURL(/financeiro\/mensalidades$/);
  await expect(page.getByRole('row').filter({ hasText: 'Adam' })).toContainText('179,00');
  await expect(page.locator('table tbody tr')).toHaveCount(3);
  const mensalidade = page.getByRole('spinbutton', { name: 'Mensalidade de Adam', exact: true });
  await expect(mensalidade).toHaveValue('130');
  await mensalidade.fill('125');
  await page.getByRole('row').filter({ hasText: 'Adam' }).getByRole('button', { name: 'Salvar' }).click();
  await expect(mensalidade).toHaveValue('125');
  await expect(page.getByRole('row').filter({ hasText: 'Adam' }).getByRole('button', { name: 'Salvar' })).toBeEnabled();
  if (alunos[0].mensalidade !== 125 || parcelas[0].valor_mensalidade !== 179 || alunos[1].mensalidade !== 150) throw new Error('Edição na tabela alterou histórico ou outro aluno');
  await page.reload();
  await expect(page.getByRole('spinbutton', { name: 'Mensalidade de Adam', exact: true })).toHaveValue('125');
  await page.getByRole('combobox', { name: 'Status de Adam', exact: true }).selectOption('Permuta');
  await page.getByRole('row').filter({ hasText: 'Adam' }).getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('combobox', { name: 'Status de Adam', exact: true })).toBeEnabled();
  if (parcelas[0].status_pagamento !== 'Permuta' || parcelas[0].valor_mensalidade !== 0 || alunos[0].mensalidade !== 0) throw new Error('Permuta não persistida ou valor não zerado');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Status de Adam', exact: true })).toHaveValue('Permuta');
  await expect(page.getByRole('spinbutton', { name: 'Mensalidade de Adam', exact: true })).toHaveValue('0');
  await expect(page.getByRole('row').filter({ hasText: 'Adam' }).locator('.badge-status')).toHaveText('🟡Permuta');
  await page.getByRole('combobox', { name: 'Status de Adam', exact: true }).selectOption('Pendente');
  await page.getByRole('spinbutton', { name: 'Mensalidade de Adam', exact: true }).fill('175');
  await page.getByRole('row').filter({ hasText: 'Adam' }).getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('combobox', { name: 'Status de Adam', exact: true })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Status de Adam', exact: true })).toHaveValue('Pendente');
  await expect(page.getByRole('spinbutton', { name: 'Mensalidade de Adam', exact: true })).toHaveValue('175');
  if (alunos[0].mensalidade !== 175 || parcelas[0].valor_mensalidade !== 175 || alunos[1].mensalidade !== 150) throw new Error('Retorno ao pagamento incorreto');
  console.log('OK: cadastro mensalidade, abas antigas removidas, fonte independente, pagamentos e histórico preservado.');
} finally { await browser.close(); }
