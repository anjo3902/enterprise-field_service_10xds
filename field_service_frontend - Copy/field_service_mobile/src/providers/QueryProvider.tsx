/* ────────────────────────────────────────────────────────────
 * React Query provider — configures the QueryClient.
 *
 * Default options mirror the web app's SWR config:
 *   - 30 s stale time & refetch interval
 *   - Refetch on window focus (AppState 'active')
 *   - Single retry on queries, no retry on mutations
 * ──────────────────────────────────────────────────────────── */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
      retry: 1,
      networkMode: 'online',
    },
    mutations: {
      retry: 0,
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
