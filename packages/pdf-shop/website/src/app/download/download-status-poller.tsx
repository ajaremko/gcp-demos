'use client'
import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'
import { Heading, Subheading, LinkButton } from '@/lib/ui'
import { StatusBadge } from '@/lib/ui/StatusBadge'
import { fetchOrderStatus } from '@/lib/query/orderStatus'

const POLL_INTERVAL_MS = 3000

const DownloadButton = styled(LinkButton)`
  width: 100%;
  text-align: center;
`

const GithubButton = styled(LinkButton)`
  width: 100%;
  text-align: center;
  margin-top: ${(props) => props.theme.spacing(2)};
  background: #24292e;

  &:hover:not(:disabled) {
    background: #1b1f23;
    box-shadow: 0 4px 12px rgba(36, 41, 46, 0.35);
  }
`

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
  const ready = data?.ready ?? false

  return (
    <>
      <Heading style={{ marginTop: '1rem' }}>
        {ready ? 'Your document is ready!' : "We're preparing your document"}
      </Heading>
      <Subheading>
        {ready
          ? 'Your document has been generated and is ready to download.'
          : 'This usually takes a few moments. This page updates automatically.'}
      </Subheading>
      {!ready && <StatusBadge state="processing">Processing</StatusBadge>}
      {ready && (
        <DownloadButton
          href={`/api/documents/${documentId}/download`}
          target="_blank"
        >
          Download PDF
        </DownloadButton>
      )}
      {ready && (
        <GithubButton
          href="https://github.com/ajaremko/gcp-demos/tree/main/packages/pdf-shop"
          target="_blank"
        >
          View Source on GitHub
        </GithubButton>
      )}
    </>
  )
}
