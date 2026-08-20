'use client'
import { useQuery } from '@tanstack/react-query'
import { HelperText } from '@/lib/ui'
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

  return (
    <HelperText>
      {data?.generated
        ? 'Your document has been generated and is ready.'
        : 'Your document is being generated in the background.'}
    </HelperText>
  )
}
