import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { frequenciaService } from '../services/api';
import type { Frequencia } from '../types';
import { useAppStore } from '../context/AppContext';

export const FREQUENCIAS_QUERY_KEY = ['frequencias'] as const;

export const useFrequencia = () => {
  const queryClient = useQueryClient();
  const addNotification = useAppStore((state) => state.addNotification);
  const query = useQuery({
    queryKey: FREQUENCIAS_QUERY_KEY,
    queryFn: () => frequenciaService.getAll(),
  });

  const fetchFrequencias = useCallback(async () => {
    const result = await query.refetch();
    return result.data ?? [];
  }, [query.refetch]);

  const getFrequenciaByData = useCallback(async (data: string) => {
    try {
      return await queryClient.fetchQuery({
        queryKey: [...FREQUENCIAS_QUERY_KEY, 'data', data],
        queryFn: () => frequenciaService.getByData(data),
        staleTime: 5 * 60 * 1000,
      });
    } catch (error) {
      addNotification(error instanceof Error ? error.message : 'Erro ao buscar frequências', 'error');
      return [];
    }
  }, [addNotification, queryClient]);

  const getFrequenciaByTurma = useCallback(async (turmaId: string) => {
    try {
      return await queryClient.fetchQuery({
        queryKey: [...FREQUENCIAS_QUERY_KEY, 'turma', turmaId],
        queryFn: () => frequenciaService.getByTurma(turmaId),
        staleTime: 5 * 60 * 1000,
      });
    } catch (error) {
      addNotification(error instanceof Error ? error.message : 'Erro ao buscar frequências', 'error');
      return [];
    }
  }, [addNotification, queryClient]);

  const createFrequencia = useCallback(async (frequencia: Omit<Frequencia, 'id'>) => {
    try {
      const created = await frequenciaService.create(frequencia);
      if (created) {
        queryClient.setQueryData<Frequencia[]>(FREQUENCIAS_QUERY_KEY, (current = []) => [...current, created]);
      }
      addNotification('Frequência registrada com sucesso!', 'success');
      return created;
    } catch (error) {
      addNotification(error instanceof Error ? error.message : 'Erro ao registrar frequência', 'error');
      throw error;
    }
  }, [addNotification, queryClient]);

  const registrarMultipla = useCallback(async (input: Omit<Frequencia, 'id'>[]) => {
    try {
      const registered = await frequenciaService.registrarMultipla(input);
      if (!Array.isArray(registered)) {
        addNotification('Erro ao registrar frequências', 'error');
        return [];
      }
      queryClient.setQueryData<Frequencia[]>(FREQUENCIAS_QUERY_KEY, (current = []) => [...current, ...registered]);
      addNotification('Frequências registradas com sucesso!', 'success');
      return registered;
    } catch (error) {
      addNotification(error instanceof Error ? error.message : 'Erro ao registrar frequências', 'error');
      console.error('Erro registrarMultipla:', error);
      return [];
    }
  }, [addNotification, queryClient]);

  const updateFrequencia = useCallback(async (id: string, frequencia: Partial<Frequencia>) => {
    try {
      const updated = await frequenciaService.update(id, frequencia);
      queryClient.setQueryData<Frequencia[]>(FREQUENCIAS_QUERY_KEY, (current = []) =>
        current.map((item) => item.id === id ? updated : item));
      addNotification('Frequência atualizada com sucesso!', 'success');
      return updated;
    } catch (error) {
      addNotification(error instanceof Error ? error.message : 'Erro ao atualizar frequência', 'error');
      throw error;
    }
  }, [addNotification, queryClient]);

  return {
    frequencias: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    fetchFrequencias,
    getFrequenciaByData,
    getFrequenciaByTurma,
    createFrequencia,
    registrarMultipla,
    updateFrequencia,
  };
};
