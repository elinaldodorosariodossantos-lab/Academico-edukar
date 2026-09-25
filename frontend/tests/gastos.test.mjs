import test from 'node:test';
import assert from 'node:assert/strict';
import { categoriasGastos, identificarCategoria, validarGasto, resumoGastos, filtrarGastos } from '../src/utils/gastos.ts';
const base = { descricao: ' Energia ', valor: 100, data: '2026-09-25', categoria: 'Energia', status: 'Pago' };
test('usa o nome cadastrado e lista somente categorias existentes', () => {
  assert.equal(identificarCategoria(' Funcionário '), 'Funcionário');
  assert.equal(identificarCategoria('Conta de energia de setembro'), 'Conta de energia de setembro');
  assert.deepEqual(categoriasGastos([]), []);
  assert.deepEqual(categoriasGastos([{...base, categoria:'Funcionário'}, {...base, categoria:'Funcionário'}, base]), ['Energia','Funcionário']);
});
test('valida dados e impede valor inválido, data impossível e enum desconhecido', () => {
  assert.equal(validarGasto(base).descricao, 'Energia');
  for (const patch of [{ valor: 0 }, { valor: -1 }, { valor: NaN }, { valor: 1.001 }, { descricao: ' ' }, { data: '2026-02-30' }, { categoria: ' ' }, { status: 'Aberto' }]) assert.throws(() => validarGasto({ ...base, ...patch }));
});
test('soma em centavos, separa pagos/pendentes e combina filtros incluindo ano', () => {
  const rows = [base, { ...base, descricao: 'Aluguel', valor: 800, categoria: 'Aluguel', status: 'Pendente' }, { ...base, valor: 120, categoria: 'Internet' }, { ...base, valor: 0.1, data: '2025-09-25' }, { ...base, valor: 0.2, data: '2026-10-01' }];
  assert.deepEqual(resumoGastos(rows), { total: 1020.3, pago: 220.3, pendente: 800 });
  assert.equal(filtrarGastos(rows, '2026-09', '', '').length, 3);
  assert.equal(filtrarGastos(rows, '2026-09', 'Aluguel', 'Pendente').length, 1);
  assert.equal(filtrarGastos(rows, '2026-09', 'Aluguel', 'Pago').length, 0);
  assert.deepEqual(resumoGastos([]), { total: 0, pago: 0, pendente: 0 });
});
