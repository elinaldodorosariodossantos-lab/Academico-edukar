import test from 'node:test';
import assert from 'node:assert/strict';
import { groupFrequencias, displayDate, isAbsent, localDate } from '../src/utils/frequencia.ts';

test('agrupa alunos pela turma/data, reconhece IDs legados e mantém os registros históricos', () => {
  const groups = groupFrequencias([
    { id: '1', turma: 'turma-1', data: '2026-09-09', aluno: 'Zélia', presenca: 'Presente' },
    { id: '2', turma: 'Robótica', data: '2026-09-09', aluno: 'Ana', presenca: 'Falta' },
    { id: '3', turma: 'Robótica', data: '2026-09-10', aluno: 'Ana', presenca: 'Ausente' },
    { id: '4', turma: 'Outra', data: '2026-09-09', aluno: 'Ana', presenca: 'Presente' },
  ], [{ id: 'turma-1', nome: 'Robótica' }]);
  assert.equal(groups.length, 3);
  assert.equal(groups[0].data, '2026-09-10');
  const group = groups.find((item) => item.turma === 'Robótica' && item.data === '2026-09-09');
  assert.equal(group.presentes, 1);
  assert.equal(group.ausentes, 1);
  assert.deepEqual(group.registros.map((item) => item.aluno), ['Ana', 'Zélia']);
});

test('não transforma status desconhecido em ausência e aceita o vocabulário dos relatórios', () => {
  assert.equal(isAbsent('Ausente'), true);
  assert.equal(isAbsent(' Falta '), true);
  assert.equal(isAbsent('Não informado'), false);
  assert.equal(groupFrequencias([], []).length, 0);
});

test('mostra datas brasileiras sem conversão de fuso e usa a data local no formulário', () => {
  assert.equal(displayDate('2026-09-09'), '09/09/2026');
  const now = new Date();
  assert.equal(localDate(), `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
});
