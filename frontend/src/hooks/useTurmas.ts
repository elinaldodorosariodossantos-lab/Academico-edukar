import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { turmasService } from '../services/api';
import type { Turma } from '../types';
import { useAppStore } from '../context/AppContext';

export const TURMAS_QUERY_KEY = ['turmas'] as const;

export const useTurmas = () => {
  const queryClient = useQueryClient();
  const addNotification = useAppStore((state) => state.addNotification);
  const query = useQuery({
    queryKey: TURMAS_QUERY_KEY,
    queryFn: () => turmasService.getAll(),
  });

  const fetchTurmas = useCallback(async () => {
    const result = await query.refetch();
    return result.data ?? [];
  }, [query.refetch]);

  const createTurma = useCallback(async (turma: Omit<Turma, 'id'>) => {
    try {
      const created = await turmasService.create(turma);
      queryClient.setQueryData<Turma[]>(TURMAS_QUERY_KEY, (current = []) => [...current, created]);
      addNotification('Turma criada com sucesso!', 'success');
      return created;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar turma';
      addNotification(message, 'error');
      throw error;
    }
  }, [addNotification, queryClient]);

  const updateTurma = useCallback(async (id: string, turma: Partial<Turma>) => {
    try {
      const updated = await turmasService.update(id, turma);
      queryClient.setQueryData<Turma[]>(TURMAS_QUERY_KEY, (current = []) =>
        current.map((item) => item.id === id ? updated : item));
      addNotification('Turma atualizada com sucesso!', 'success');
      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar turma';
      addNotification(message, 'error');
      throw error;
    }
  }, [addNotification, queryClient]);

  const deleteTurma = useCallback(async (id: string) => {
    try {
      await turmasService.delete(id);
      queryClient.setQueryData<Turma[]>(TURMAS_QUERY_KEY, (current = []) =>
        current.filter((item) => item.id !== id));
      addNotification('Turma removida com sucesso!', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao remover turma';
      addNotification(message, 'error');
      throw error;
    }
  }, [addNotification, queryClient]);

  return {
    turmas: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    fetchTurmas,
    createTurma,
    updateTurma,
    deleteTurma,
  };
};
