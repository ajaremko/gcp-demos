import { useQuery } from '@tanstack/react-query'

import { type RendererStatus } from '@/lib/renderClient'

const READY_POLL_INTERVAL_MS = 5000

async function fetchStatus(): Promise<RendererStatus> {
  const response = await fetch('/api/ready')
  if (!response.ok) return 'unavailable'
  const data = (await response.json()) as { status: RendererStatus }
  return data.status
}

/**
 * Polls GET /api/ready on a shared interval. Every caller subscribes to the
 * same react-query cache entry, so the underlying fetch is deduped and
 * polling automatically starts/stops based on whether any consumer is
 * mounted.
 */
export function useRendererStatus(): {
  status: RendererStatus
  isLoading: boolean
} {
  const query = useQuery({
    queryKey: ['renderer-status'],
    queryFn: fetchStatus,
    refetchInterval: READY_POLL_INTERVAL_MS,
  })

  return {
    status: query.data ?? 'unavailable',
    isLoading: query.isPending,
  }
}
