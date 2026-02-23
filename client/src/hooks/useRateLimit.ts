// src/hooks/useRateLimit.ts
import { trpc } from '../lib/trpc';

export function useRateLimit() {
  const { data, refetch } = trpc.code.getRateLimit.useQuery(undefined, {
    refetchInterval: 60000, // poll every minute
  });

  return {
    current: data?.current ?? 0,
    limit: data?.limit ?? 5,
    resetTime: data?.resetTime ? new Date(data.resetTime) : undefined,
    refetch,
  };
}
