import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

type LazyModule<T extends ComponentType<unknown>> = Promise<{ default: T }>;

/**
 * Recupera automaticamente uma rota lazy quando um deploy substitui seus
 * arquivos versionados enquanto o sistema ainda está aberto no navegador.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  importModule: () => LazyModule<T>,
  moduleName: string,
): LazyExoticComponent<T> {
  return lazy(async () => {
    const reloadKey = `lazy-reload:${moduleName}`;

    try {
      const module = await importModule();
      sessionStorage.removeItem(reloadKey);
      return module;
    } catch (error) {
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, 'true');
        window.location.reload();

        return new Promise<never>(() => undefined);
      }

      sessionStorage.removeItem(reloadKey);
      throw error;
    }
  });
}
