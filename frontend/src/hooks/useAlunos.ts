import { useCallback, useState } from 'react';
import { isCancelledError, useQuery, useQueryClient } from '@tanstack/react-query';
import { alunosService, turmasService } from '../services/api';
import type { Aluno } from '../types';
import { useAppStore } from '../context/AppContext';
import { TURMAS_QUERY_KEY } from './useTurmas';

export const ALUNOS_QUERY_KEY = ['alunos'] as const;
const ALUNOS_SEARCH_QUERY_KEY = ['alunos', 'search'] as const;

export const useAlunos = () => {
  const queryClient = useQueryClient();
  const addNotification = useAppStore((state) => state.addNotification);
  const [searchResults, setSearchResults] = useState<Aluno[] | null>(null);
  const query = useQuery({
    queryKey: ALUNOS_QUERY_KEY,
    queryFn: () => alunosService.getAll(),
  });

  const fetchAlunos = useCallback(async () => {
    setSearchResults(null);
    const result = await query.refetch();
    return result.data ?? [];
  }, [query.refetch]);

  const syncTurmasAfterMutation = useCallback(async (alunos: Aluno[]) => {
    await turmasService.syncQuantidadeAlunos(alunos);
    await queryClient.invalidateQueries({ queryKey: TURMAS_QUERY_KEY });
  }, [queryClient]);

  const createAluno = useCallback(async (aluno: Omit<Aluno, 'id'>) => {
    try {
      const created = await alunosService.create(aluno);
      const current = queryClient.getQueryData<Aluno[]>(ALUNOS_QUERY_KEY) ?? [];
      const next = [created, ...current];
      queryClient.setQueryData(ALUNOS_QUERY_KEY, next);
      setSearchResults(null);
      addNotification('Aluno criado com sucesso!', 'success');
      void syncTurmasAfterMutation(next).catch(() => {
        queryClient.invalidateQueries({ queryKey: TURMAS_QUERY_KEY });
      });
      return created;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar aluno';
      addNotification(message, 'error');
      throw error;
    }
  }, [addNotification, queryClient, syncTurmasAfterMutation]);

  const updateAluno = useCallback(async (id: string, aluno: Partial<Aluno>) => {
    try {
      const updated = await alunosService.update(id, aluno);
      const current = queryClient.getQueryData<Aluno[]>(ALUNOS_QUERY_KEY) ?? [];
      const next = current.map((item) => item.id === id ? updated : item);
      queryClient.setQueryData(ALUNOS_QUERY_KEY, next);
      setSearchResults(null);
      await syncTurmasAfterMutation(next);
      addNotification('Aluno atualizado com sucesso!', 'success');
      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar aluno';
      addNotification(message, 'error');
      throw error;
    }
  }, [addNotification, queryClient, syncTurmasAfterMutation]);

  const deleteAluno = useCallback(async (id: string) => {
    try {
      await alunosService.delete(id);
      const current = queryClient.getQueryData<Aluno[]>(ALUNOS_QUERY_KEY) ?? [];
      const next = current.filter((item) => item.id !== id);
      queryClient.setQueryData(ALUNOS_QUERY_KEY, next);
      setSearchResults(null);
      await syncTurmasAfterMutation(next);
      addNotification('Aluno removido com sucesso!', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao remover aluno';
      addNotification(message, 'error');
      throw error;
    }
  }, [addNotification, queryClient, syncTurmasAfterMutation]);

  const searchAlunos = useCallback(async (termo: string) => {
    const normalized = termo.trim().toLocaleLowerCase('pt-BR');
    await queryClient.cancelQueries({ queryKey: ALUNOS_SEARCH_QUERY_KEY });

    if (!normalized) {
      setSearchResults(null);
      return queryClient.getQueryData<Aluno[]>(ALUNOS_QUERY_KEY) ?? [];
    }

    if (normalized.length < 3) {
      const local = (queryClient.getQueryData<Aluno[]>(ALUNOS_QUERY_KEY) ?? []).filter((aluno) =>
        aluno.nome.toLocaleLowerCase('pt-BR').includes(normalized) ||
        aluno.turma?.toLocaleLowerCase('pt-BR').includes(normalized));
      setSearchResults(local);
      return local;
    }

    try {
      const result = await queryClient.fetchQuery({
        queryKey: [...ALUNOS_SEARCH_QUERY_KEY, normalized],
        queryFn: ({ signal }) => alunosService.search(termo, signal),
        staleTime: 5 * 60 * 1000,
      });
      setSearchResults(result);
      return result;
    } catch (error) {
      if (isCancelledError(error) || (error as Error)?.name === 'AbortError') return [];
      const message = error instanceof Error ? error.message : 'Erro ao buscar alunos';
      addNotification(message, 'error');
      throw error;
    }
  }, [addNotification, queryClient]);

  return {
    alunos: searchResults ?? query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    fetchAlunos,
    createAluno,
    updateAluno,
    deleteAluno,
    searchAlunos,
  };
};
