import type { CategoriaGasto, GastoInput } from '../types/gastos.ts';

export function identificarCategoria(descricao: string): CategoriaGasto {
  return descricao.trim();
}

export function categoriasGastos(gastos: GastoInput[]): string[] {
  return [...new Set(gastos.map(g => g.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function validarGasto(input: GastoInput): GastoInput {
  if (input.recorrente !== undefined && typeof input.recorrente !== 'boolean') throw new Error('Informe se o gasto é recorrente.');
  const descricao = input.descricao.trim();
  if (!descricao || descricao.length > 200) throw new Error('Informe uma descrição com até 200 caracteres.');
  if (!Number.isFinite(input.valor) || input.valor <= 0 || input.valor > 9999999999.99 || Math.abs(input.valor * 100 - Math.round(input.valor * 100)) > 0.001) {
    throw new Error('Informe um valor positivo com até duas casas decimais.');
  }
  const date = new Date(`${input.data}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.data) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.data) throw new Error('Informe uma data válida.');
  if (!input.categoria.trim() || input.categoria.trim().length > 200) throw new Error('Selecione uma categoria válida.');
  if (input.status !== 'Pago' && input.status !== 'Pendente') throw new Error('Selecione um status válido.');
  return { ...input, descricao, valor: Math.round(input.valor * 100) / 100 };
}

export function resumoGastos(gastos: GastoInput[]) {
  const pago = gastos.filter(g => g.status === 'Pago').reduce((sum, g) => sum + Math.round(g.valor * 100), 0);
  const pendente = gastos.filter(g => g.status === 'Pendente').reduce((sum, g) => sum + Math.round(g.valor * 100), 0);
  return { total: (pago + pendente) / 100, pago: pago / 100, pendente: pendente / 100 };
}

export function filtrarGastos<T extends GastoInput>(gastos: T[], mes: string, categoria: string, status: string): T[] {
  return gastos.filter(g => (!mes || g.data.startsWith(`${mes}-`)) && (!categoria || g.categoria === categoria) && (!status || g.status === status));
}
