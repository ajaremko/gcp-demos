'use client'
import { useQuery } from '@tanstack/react-query'
import { Card, Heading, Subheading, HelperText } from '@/lib/ui'
import { StatusBadge } from '@/lib/StatusBadge'
import { fetchOrderStatus } from '@/lib/orderStatus'

const POLL_INTERVAL_MS = 3000

export function OrderSummaryPanel({
  title,
  documentId,
  initialGenerated,
}: {
  title: string
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
    <Card>
      <Heading as="h2" style={{ fontSize: '1.25rem' }}>
        Order summary
      </Heading>
      <Subheading>&quot;{title}&quot;</Subheading>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Document generation</span>
        <span>$9.99</span>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 700,
          marginTop: '8px',
          marginBottom: '16px',
        }}
      >
        <span>Total</span>
        <span>$9.99</span>
      </div>
      <HelperText>Generation status</HelperText>
      <div style={{ marginTop: '8px' }}>
        <StatusBadge state={data?.generated ? 'ready' : 'processing'}>
          {data?.generated ? 'Ready for download' : 'Queued for generation'}
        </StatusBadge>
      </div>
    </Card>
  )
}
