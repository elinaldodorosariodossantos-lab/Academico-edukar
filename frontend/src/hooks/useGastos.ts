import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { gastosService } from '../services/gastos';
import type { Gasto, GastoInput } from '../types/gastos';

const KEY = ['gastos'] as const;
export function useGastos() {
  const cache = useQueryClient();
  const [live, setLive] = useState(false);
  const query = useQuery({ queryKey: KEY, queryFn: gastosService.list, refetchOnWindowFocus: true });
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const channel = client.channel('gastos-lista').on('postgres_changes', { event: '*', schema: 'public', table: 'gastos' }, () => {
      void cache.invalidateQueries({ queryKey: KEY });
    }).subscribe(status => {
      setLive(status === 'SUBSCRIBED');
      if (status === 'SUBSCRIBED') void cache.invalidateQueries({ queryKey: KEY });
    });
    return () => { void client.removeChannel(channel); };
  }, [cache]);
  const save = async (input: GastoInput, original?: Gasto) => {
    try {
      const saved = await gastosService.save(input, original);
      await cache.cancelQueries({ queryKey: KEY });
      cache.setQueryData<Gasto[]>(KEY, (current = []) => [saved, ...current.filter(g => g.id !== saved.id)]);
      return saved;
    } finally { void cache.invalidateQueries({ queryKey: KEY }); }
  };
  const remove = async (gasto: Gasto) => {
    try {
      await gastosService.remove(gasto);
      await cache.cancelQueries({ queryKey: KEY });
      cache.setQueryData<Gasto[]>(KEY, (current = []) => current.filter(g => g.id !== gasto.id));
    } finally { void cache.invalidateQueries({ queryKey: KEY }); }
  };
  return { ...query, gastos: query.data ?? [], live, save, remove };
}
