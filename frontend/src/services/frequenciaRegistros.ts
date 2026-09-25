import { supabase } from '../lib/supabase';
import type { Frequencia } from '../types';
import { DUPLICATE_FREQUENCIA_MESSAGE } from '../utils/frequencia';

const normalize = (item: any): Frequencia => ({
  id: item.id, data: item.data, turma: item.turma, aluno: item.aluno, presenca: item.presenca,
  conteudoMinistrado: item.conteudo_ministrado, observacoes: item.observacoes,
  professorResponsavel: item.professor_responsavel, createdAt: item.created_at, updatedAt: item.updated_at,
});

async function callRegistro(operation: string, params: Record<string, unknown>): Promise<Frequencia[]> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.rpc(operation, params);
  if (error) {
    if (error.code === '23505') throw new Error(DUPLICATE_FREQUENCIA_MESSAGE);
    if (error.code === 'PGRST202') throw new Error('É necessário aplicar a atualização de frequência no Supabase antes de salvar alterações.');
    throw new Error(error.message || 'Não foi possível salvar a frequência.');
  }
  return (data || []).map(normalize);
}

export const frequenciaRegistros = {
  async create(input: Omit<Frequencia, 'id'>[]) {
    if (!input.length) throw new Error('Não há alunos vinculados a esta turma.');
    const first = input[0];
    if (!first.turma || !first.data || input.some((item) => item.turma !== first.turma || item.data !== first.data)) {
      throw new Error('Informe uma turma e uma data válidas para toda a frequência.');
    }
    return callRegistro('criar_registro_frequencia', {
      p_turma: first.turma, p_data: first.data,
      p_alunos: input.map((item) => ({ aluno: item.aluno, presenca: item.presenca,
        conteudo_ministrado: item.conteudoMinistrado, observacoes: item.observacoes,
        professor_responsavel: item.professorResponsavel })),
    });
  },
  update(original: Frequencia[], data: string, statuses: Record<string, Frequencia['presenca']>, details: Partial<Pick<Frequencia, 'conteudoMinistrado' | 'observacoes'>> = {}) {
    return callRegistro('editar_registro_frequencia', {
      p_data: data,
      p_registros: original.map((item) => ({ id: item.id, data: item.data, turma: item.turma,
        updated_at: item.updatedAt ?? null, presenca: statuses[item.id], conteudo_ministrado: details.conteudoMinistrado ?? item.conteudoMinistrado, observacoes: details.observacoes ?? item.observacoes })),
    });
  },
  remove(original: Frequencia[]) {
    return callRegistro('excluir_registro_frequencia', {
      p_registros: original.map((item) => ({ id: item.id, data: item.data, turma: item.turma, updated_at: item.updatedAt ?? null })),
    });
  },
};
