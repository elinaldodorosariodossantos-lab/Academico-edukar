import { supabase } from '../lib/supabase';
import type { Gasto, GastoInput } from '../types/gastos';
import { identificarCategoria, validarGasto } from '../utils/gastos';

const client = () => {
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
};
function fail(error: { code?: string; message: string }): never {
  if (['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error.code || '')) throw new Error('O módulo Gastos precisa da migração de banco. Aplique gastos.sql no Supabase.');
  throw new Error(error.message || 'Não foi possível acessar os gastos.');
}
export const gastosService = {
  async list(): Promise<Gasto[]> {
    const result: Gasto[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client().from('gastos').select('*').order('data', { ascending: false }).order('id').range(offset, offset + 999);
      if (error) fail(error);
      result.push(...(data as Gasto[]));
      if (data.length < 1000) return result;
    }
  },
  async save(input: GastoInput, original?: Gasto): Promise<Gasto> {
    const categoria = original && original.descricao.trim() === input.descricao.trim()
      ? original.categoria
      : identificarCategoria(input.descricao);
    const payload = validarGasto({ ...input, categoria });
    const request = original
      ? client().from('gastos').update(payload).eq('id', original.id).eq('updated_at', original.updated_at)
      : client().from('gastos').insert(payload);
    const { data, error } = await request.select().maybeSingle();
    if (error) fail(error);
    if (!data) throw new Error('Este gasto foi alterado ou excluído por outra pessoa. Feche o formulário e abra o registro atualizado.');
    return data as Gasto;
  },
  async remove(original: Gasto) {
    const { data, error } = await client().from('gastos').delete().eq('id', original.id).eq('updated_at', original.updated_at).select('id');
    if (error) fail(error);
    if (!data.length) throw new Error('Este gasto foi alterado ou excluído por outra pessoa. Atualize a lista e tente novamente.');
  },
};
