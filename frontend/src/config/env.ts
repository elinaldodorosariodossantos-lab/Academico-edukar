const readEnv = (value: string | undefined, fallback: string) => value?.trim() || fallback;

export const appConfig = Object.freeze({
  name: readEnv(import.meta.env.VITE_APP_NAME, 'Edukar XP'),
  version: readEnv(import.meta.env.VITE_APP_VERSION, '1.0.0'),
});

