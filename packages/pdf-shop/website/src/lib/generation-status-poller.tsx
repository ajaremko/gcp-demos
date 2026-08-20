'use client'
import { useQuery } from '@tanstack/react-query'
import { fetchOrderStatus } from '@/lib/orderStatus'

const POLL_INTERVAL_MS = 3000

export function GenerationStatusPoller({
  documentId,
  initialGenerated,
}: {
  documentId: string
  initialGenerated: boolean
}) {
  const { data } = useQuery({
    queryKey: ['order-status', documentId],
    queryFn: () => fetchOrderStatus(documentId),
    initialData: initialGenerated
      ? { ready: false, paid: false, generated: true }
      : undefined,
    refetchInterval: (query) =>
      query.state.data?.generated ? false : POLL_INTERVAL_MS,
  })

  return data?.generated
    ? 'Your document is ready for download! Complete payment to access it.'
    : 'Your document is being generated. Complete payment to access it.'
}
