'use client'
import { useQuery } from '@tanstack/react-query'
import { HelperText, LinkButton } from '@/lib/ui'
import { fetchOrderStatus } from '@/lib/orderStatus'

const POLL_INTERVAL_MS = 3000

export function DownloadStatusPoller({
  documentId,
  initialReady,
}: {
  documentId: string
  initialReady: boolean
}) {
  const { data } = useQuery({
    queryKey: ['order-status', documentId],
    queryFn: () => fetchOrderStatus(documentId),
    initialData: initialReady
      ? { ready: true, paid: true, generated: true }
      : undefined,
    refetchInterval: (query) =>
      query.state.data?.ready ? false : POLL_INTERVAL_MS,
  })

  if (data?.ready) {
    return (
      <LinkButton
        href={`/api/documents/${documentId}/download`}
        target="_blank"
      >
        Download PDF
      </LinkButton>
    )
  }

  return (
    <HelperText>
      Still processing your document — this page will update automatically once
      it&apos;s ready.
    </HelperText>
  )
}
