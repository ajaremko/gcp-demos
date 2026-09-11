import { useQuery } from '@tanstack/react-query'

const READY_POLL_INTERVAL_MS = 5000

async function fetchReady(): Promise<boolean> {
  const response = await fetch('/api/ready')
  if (!response.ok) return false
  const data = (await response.json()) as { ready: boolean }
  return data.ready
}

/**
 * Polls GET /api/ready on a shared interval. Every caller subscribes to the
 * same react-query cache entry, so the underlying fetch is deduped and
 * polling automatically starts/stops based on whether any consumer is
 * mounted.
 */
export function useRendererReady(): { ready: boolean; isLoading: boolean } {
  const query = useQuery({
    queryKey: ['renderer-ready'],
    queryFn: fetchReady,
    refetchInterval: READY_POLL_INTERVAL_MS,
  })

  return {
    ready: query.data ?? false,
    isLoading: query.isPending,
  }
}
