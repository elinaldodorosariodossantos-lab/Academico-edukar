export type CategoriaGasto = string;
export type StatusGasto = 'Pago' | 'Pendente';
export interface GastoInput {
  descricao: string;
  valor: number;
  data: string;
  categoria: CategoriaGasto;
  status: StatusGasto;
  recorrente?: boolean;
}
export interface Gasto extends GastoInput {
  id: string;
  created_at: string;
  updated_at: string;
}
