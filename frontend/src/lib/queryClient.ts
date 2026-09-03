import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchInterval: 10 * 1000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
