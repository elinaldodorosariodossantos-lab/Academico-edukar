import { useEffect } from 'react';
import { appConfig } from '../config/env';
import { supabase } from '../lib/supabase';

type ConnectionStatus = 'connected' | 'disconnected' | null;

/**
 * Verifica a conectividade sem ler registros nem alterar o banco.
 * O monitor é opt-in e só permanece ativo enquanto a aplicação está aberta.
 */
export function useSupabaseConnectivityMonitor() {
  useEffect(() => {
    const { enabled, intervalMs } = appConfig.supabaseConnectivityMonitor;

    if (!enabled) return undefined;

    if (!supabase) {
      console.warn('[Supabase connectivity] Monitor ativo, mas o cliente não está configurado.');
      return undefined;
    }

    let status: ConnectionStatus = null;
    let requestInProgress = false;
    let activeController: AbortController | null = null;
    let active = true;

    const checkConnection = async () => {
      if (requestInProgress || document.hidden || !navigator.onLine) return;

      requestInProgress = true;
      activeController = new AbortController();
      const timeoutId = window.setTimeout(() => activeController?.abort(), 10_000);

      try {
        const { error } = await supabase
          .from('horarios')
          .select('id', { head: true })
          .limit(1)
          .abortSignal(activeController.signal);

        if (error) throw error;

        if (status !== 'connected') {
          console.info(
            status === 'disconnected'
              ? '[Supabase connectivity] Conexão restabelecida.'
              : '[Supabase connectivity] Conexão confirmada.',
          );
        }
        status = 'connected';
      } catch (error) {
        if (!active) return;

        if (activeController?.signal.aborted) {
          console.warn('[Supabase connectivity] Verificação excedeu o limite de 10 segundos.');
        } else {
          console.warn('[Supabase connectivity] Falha na verificação de conexão.', error);
        }
        status = 'disconnected';
      } finally {
        window.clearTimeout(timeoutId);
        activeController = null;
        requestInProgress = false;
      }
    };

    const handleOnline = () => void checkConnection();
    const handleVisibilityChange = () => {
      if (!document.hidden) void checkConnection();
    };

    void checkConnection();
    const intervalId = window.setInterval(checkConnection, intervalMs);
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      activeController?.abort();
    };
  }, []);
}
