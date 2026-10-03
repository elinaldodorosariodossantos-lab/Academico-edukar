import { supabase } from '../lib/supabase';
import type { Frequencia } from '../types';
import { DUPLICATE_FREQUENCIA_MESSAGE } from '../utils/frequencia';

const normalize = (item: any): Frequencia => ({
  id: item.id, data: item.data, turma: item.turma, aluno: item.aluno, alunoId: item.aluno_id, presenca: item.presenca,
  conteudoMinistrado: item.conteudo_ministrado, observacoes: item.observacoes,
  professorResponsavel: item.professor_responsavel, createdAt: item.created_at, updatedAt: item.updated_at,
});

async function callRegistro(operation: string, params: Record<string, unknown>, onMissing?: () => Promise<Frequencia[]>): Promise<Frequencia[]> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.rpc(operation, params);
  if (error) {
    if (error.code === 'PGRST202' && onMissing) return onMissing();
    if (error.code === '23505') throw new Error(DUPLICATE_FREQUENCIA_MESSAGE);
    if (error.code === 'PGRST202') throw new Error('É necessário aplicar a atualização de frequência no Supabase antes de salvar alterações.');
    throw new Error(error.message || 'Não foi possível salvar a frequência.');
  }
  return (data || []).map(normalize);
}

// Compatibilidade com projetos que ainda possuem somente o schema inicial.
// Um único INSERT mantém o lote atômico; a RPC continua preferida por também
// proteger contra chamadas simultâneas de usuários diferentes.
async function createWithoutRpc(input: Omit<Frequencia, 'id'>[]): Promise<Frequencia[]> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const first = input[0];
  const { data: turmas, error: turmaError } = await supabase.from('turmas').select('id, nome');
  if (turmaError) throw new Error(turmaError.message);
  const turma = turmas?.find((item) => item.id === first.turma)?.nome ?? first.turma;
  const aliases = [...new Set([first.turma, turma, ...(turmas ?? []).filter((item) => item.nome === turma).map((item) => item.id)])];
  const { data: existing, error: lookupError } = await supabase.from('frequencias')
    .select('id').eq('data', first.data).in('turma', aliases).limit(1);
  if (lookupError) throw new Error(lookupError.message);
  if (existing?.length) throw new Error(DUPLICATE_FREQUENCIA_MESSAGE);

  const { data, error } = await supabase.from('frequencias').insert(input.map((item) => ({
    turma, data: item.data, aluno: item.aluno, presenca: item.presenca,
    conteudo_ministrado: item.conteudoMinistrado ?? '', observacoes: item.observacoes ?? '',
    professor_responsavel: item.professorResponsavel ?? '',
  }))).select('*');
  if (error) throw new Error(error.code === '23505' ? DUPLICATE_FREQUENCIA_MESSAGE : error.message);
  return (data ?? []).map(normalize);
}

export const frequenciaRegistros = {
  async create(input: Omit<Frequencia, 'id'>[]) {
    if (!input.length) throw new Error('Não há alunos vinculados a esta turma.');
    const first = input[0];
    if (!first.turma || !first.data || input.some((item) => item.turma !== first.turma || item.data !== first.data)) {
      throw new Error('Informe uma turma e uma data válidas para toda a frequência.');
    }
    const date = new Date(`${first.data}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(first.data) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== first.data) {
      throw new Error('Informe uma data válida.');
    }
    if (input.some((item) => !item.aluno?.trim() || !['Presente', 'Falta'].includes(item.presenca))) {
      throw new Error('Informe o aluno e seu status de presença.');
    }
    return callRegistro('criar_registro_frequencia', {
      p_turma: first.turma, p_data: first.data,
      p_alunos: input.map((item) => ({ aluno: item.aluno, aluno_id: item.alunoId, presenca: item.presenca,
        conteudo_ministrado: item.conteudoMinistrado, observacoes: item.observacoes,
        professor_responsavel: item.professorResponsavel })),
    }, () => createWithoutRpc(input));
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
