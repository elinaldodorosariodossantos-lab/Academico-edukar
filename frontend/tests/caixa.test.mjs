import test from 'node:test';
import assert from 'node:assert/strict';
import { resumoCaixa } from '../src/utils/caixa.ts';
const receitas = [
  { valorMensalidade: 600, statusPagamento: 'Pago' },
  { valorMensalidade: 400, statusPagamento: 'Pago' },
  { valorMensalidade: 180, statusPagamento: 'Pendente' },
  { valorMensalidade: 150, statusPagamento: 'Permuta' },
];
const gasto = (valor, status) => ({ descricao: 'Despesa', valor, status, data: '2026-10-02', categoria: 'Outros' });
test('regra definitiva inclui gastos antigos e recalcula entradas e pagamentos', () => {
  const entradas = [{ valorMensalidade: 1219, statusPagamento: 'Pago' }];
  const saidas = [
    { ...gasto(100, 'Pago'), data: '2025-01-10' },
    { ...gasto(80, 'Pago'), data: '2026-09-15' },
    gasto(120, 'Pago'), gasto(50, 'Pendente'),
  ];
  assert.deepEqual(resumoCaixa(entradas, saidas), { receitaRecebida: 1219, gastos: { total: 350, pago: 300, pendente: 50 }, dinheiroEmCaixa: 919 });
  saidas[3].status = 'Pago';
  assert.equal(resumoCaixa(entradas, saidas).dinheiroEmCaixa, 869);
  assert.equal(resumoCaixa(entradas, saidas).receitaRecebida, 1219);
  saidas[3].status = 'Pendente';
  entradas.push({ valorMensalidade: 200, statusPagamento: 'Pago' });
  assert.equal(resumoCaixa(entradas, saidas).dinheiroEmCaixa, 1119);
  saidas[3].status = 'Pago';
  assert.equal(resumoCaixa(entradas, saidas).dinheiroEmCaixa, 1069);
});
test('caixa considera só receitas recebidas e gastos pagos', () => {
  assert.deepEqual(resumoCaixa(receitas, [gasto(100, 'Pago'), gasto(80, 'Pago'), gasto(120, 'Pendente')]), {
    receitaRecebida: 1000, gastos: { total: 300, pago: 180, pendente: 120 }, dinheiroEmCaixa: 820,
  });
});
test('pagamento, reversão, edição e exclusão recalculam sem alterar receitas', () => {
  const original = structuredClone(receitas);
  const gastos = [gasto(80, 'Pendente')];
  assert.equal(resumoCaixa(receitas, gastos).dinheiroEmCaixa, 1000);
  gastos[0].status = 'Pago';
  assert.equal(resumoCaixa(receitas, gastos).dinheiroEmCaixa, 920);
  gastos[0].valor = 100;
  assert.equal(resumoCaixa(receitas, gastos).dinheiroEmCaixa, 900);
  gastos[0].status = 'Pendente';
  assert.equal(resumoCaixa(receitas, gastos).dinheiroEmCaixa, 1000);
  gastos.splice(0, 1);
  assert.equal(resumoCaixa(receitas, gastos).dinheiroEmCaixa, 1000);
  assert.deepEqual(receitas, original);
});
test('mantém centavos, saldo negativo e ausência de movimentos', () => {
  assert.equal(resumoCaixa([{ valorMensalidade: 0.1, statusPagamento: 'Pago' }, { valorMensalidade: 0.2, statusPagamento: 'Pago' }], [gasto(0.1, 'Pago')]).dinheiroEmCaixa, 0.2);
  assert.equal(resumoCaixa([], [gasto(100, 'Pago')]).dinheiroEmCaixa, -100);
  assert.equal(resumoCaixa([], []).dinheiroEmCaixa, 0);
});
