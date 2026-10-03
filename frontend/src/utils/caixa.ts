import type { FinanceiroAluno } from '../types/index.ts';
import type { GastoInput } from '../types/gastos.ts';
import { resumoGastos } from './gastos.ts';

// Saldo acumulado de registros persistidos, independente de filtros e rascunhos.
export function resumoCaixa(mensalidades: Pick<FinanceiroAluno, 'valorMensalidade' | 'statusPagamento'>[], gastos: GastoInput[]) {
  const recebido = mensalidades.filter(m => m.statusPagamento === 'Pago')
    .reduce((total, m) => total + Math.round(Number(m.valorMensalidade) * 100), 0);
  const despesas = resumoGastos(gastos);
  return { receitaRecebida: recebido / 100, gastos: despesas,
    dinheiroEmCaixa: (recebido - Math.round(despesas.pago * 100)) / 100 };
}
