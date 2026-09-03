import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { horariosService } from '../services/api';
import type { Horario } from '../types';
import { useAppStore } from '../context/AppContext';

export const HORARIOS_QUERY_KEY = ['horarios'] as const;

export const useHorarios = () => {
  const queryClient = useQueryClient();
  const addNotification = useAppStore((state) => state.addNotification);
  const query = useQuery({
    queryKey: HORARIOS_QUERY_KEY,
    queryFn: () => horariosService.getAll(),
  });

  const fetchHorarios = useCallback(async () => {
    const result = await query.refetch();
    return result.data ?? [];
  }, [query.refetch]);

  const createHorario = useCallback(async (horario: Omit<Horario, 'id'>) => {
    try {
      const created = await horariosService.create(horario);
      queryClient.setQueryData<Horario[]>(HORARIOS_QUERY_KEY, (current = []) => [...current, created]);
      addNotification('Horário criado com sucesso!', 'success');
      return created;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar horário';
      addNotification(message, 'error');
      throw error;
    }
  }, [addNotification, queryClient]);

  const updateHorario = useCallback(async (id: string, horario: Partial<Horario>) => {
    try {
      const updated = await horariosService.update(id, horario);
      queryClient.setQueryData<Horario[]>(HORARIOS_QUERY_KEY, (current = []) =>
        current.map((item) => (item.id === id ? updated : item)));
      addNotification('Horário atualizado com sucesso!', 'success');
      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar horário';
      addNotification(message, 'error');
      throw error;
    }
  }, [addNotification, queryClient]);

  const deleteHorario = useCallback(async (id: string) => {
    try {
      await horariosService.delete(id);
      queryClient.setQueryData<Horario[]>(HORARIOS_QUERY_KEY, (current = []) =>
        current.filter((item) => item.id !== id));
      addNotification('Horário removido com sucesso!', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao remover horário';
      addNotification(message, 'error');
      throw error;
    }
  }, [addNotification, queryClient]);

  return {
    horarios: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    fetchHorarios,
    createHorario,
    updateHorario,
    deleteHorario,
  };
};
