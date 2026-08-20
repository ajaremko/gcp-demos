'use client'
import { Button, Card, Heading, Subheading, LinkButton } from '@/lib/ui'
import { useOrderStatus } from '@/lib/useOrderStatus'

export function DownloadStep({
  documentId,
  initialReady,
}: {
  documentId: string
  initialReady: boolean
}) {
  const initialData = initialReady
    ? { ready: true, paid: true, generated: true }
    : undefined
  const { data } = useOrderStatus(documentId, initialData)

  const subheading = data?.ready
    ? 'Your document is ready for download.'
    : 'Your document is being generated in the background.'

  const downloadHref = data?.ready
    ? `/api/documents/${documentId}/download`
    : undefined

  return (
    <Card>
      <Heading>Download Your Document</Heading>
      <Subheading>{subheading}</Subheading>
      {downloadHref ? (
        <LinkButton href={downloadHref} target="_blank">
          Download PDF
        </LinkButton>
      ) : (
        <Button disabled>Download PDF</Button>
      )}
    </Card>
  )
}
