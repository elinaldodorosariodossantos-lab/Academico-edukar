import type { Frequencia, Turma } from '../types';

export const DUPLICATE_FREQUENCIA_MESSAGE = 'Já existe uma frequência registrada para esta turma nesta data. Utilize a opção de edição para realizar alterações.';
export const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
export const displayDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date)
  ? date.split('-').reverse().join('/') : date || 'Data não informada';
export const isPresent = (status: string) => status?.trim().toLocaleLowerCase('pt-BR') === 'presente';
export const isAbsent = (status: string) => ['falta', 'ausente'].includes(status?.trim().toLocaleLowerCase('pt-BR'));
export const turmaName = (name: string, turmas: Turma[]) => turmas.find((turma) => turma.id === name)?.nome || name;

export interface FrequenciaGrupo {
  key: string;
  turma: string;
  data: string;
  registros: Frequencia[];
  presentes: number;
  ausentes: number;
  createdAt: string;
}

export function groupFrequencias(registros: Frequencia[], turmas: Turma[]): FrequenciaGrupo[] {
  const groups = new Map<string, FrequenciaGrupo>();
  for (const registro of registros) {
    const turma = turmaName(registro.turma, turmas);
    const key = JSON.stringify([turma, registro.data]);
    const group = groups.get(key) || { key, turma, data: registro.data, registros: [], presentes: 0, ausentes: 0, createdAt: '' };
    group.registros.push(registro);
    group.presentes += Number(isPresent(registro.presenca));
    group.ausentes += Number(isAbsent(registro.presenca));
    if ((registro.createdAt || '') > group.createdAt) group.createdAt = registro.createdAt!;
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({ ...group, registros: group.registros.sort((a, b) => (a.aluno || '').localeCompare(b.aluno || '', 'pt-BR')) }))
    .sort((a, b) => (b.data || '').localeCompare(a.data || '') || b.createdAt.localeCompare(a.createdAt) || a.turma.localeCompare(b.turma, 'pt-BR'));
}
