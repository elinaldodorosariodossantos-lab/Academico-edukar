const readEnv = (value: string | undefined, fallback: string) => value?.trim() || fallback;

const readBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined || value.trim() === '') return fallback;
  return value.trim().toLowerCase() === 'true';
};

const readInterval = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 60_000 ? parsed : fallback;
};

export const appConfig = Object.freeze({
  name: readEnv(import.meta.env.VITE_APP_NAME, 'Edukar XP'),
  version: readEnv(import.meta.env.VITE_APP_VERSION, '1.0.0'),
  supabaseConnectivityMonitor: Object.freeze({
    enabled: readBoolean(import.meta.env.VITE_SUPABASE_CONNECTIVITY_MONITOR_ENABLED, false),
    intervalMs: readInterval(
      import.meta.env.VITE_SUPABASE_CONNECTIVITY_MONITOR_INTERVAL_MS,
      5 * 60 * 1000,
    ),
  }),
});
