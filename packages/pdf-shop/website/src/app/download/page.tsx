import { redirect } from 'next/navigation'

import { CheckOrderStatusHandler } from '@org/pdf-shop-application'

import { PageShell, Card } from '@/lib/ui'
import { ReturnHomeLink } from '@/lib/ui/ReturnHomeLink'
import { pinoLogger } from '@/lib/server/pino'
import { resolveDataRoot } from '@/lib/server/dataRoot'
import { documentIdSchema } from '@/lib/validation/schemas'

import { DownloadStatusPoller } from './download-status-poller'

export default async function DownloadPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string }>
}) {
  const { doc: documentId } = await searchParams
  if (!documentId) {
    redirect('/create')
  }
  const parsed = documentIdSchema.safeParse({ documentId })

  let status: { paid: boolean; generated: boolean } | null = null
  if (parsed.success) {
    const handler = CheckOrderStatusHandler({
      dataRoot: resolveDataRoot(),
      logger: pinoLogger,
    })
    try {
      status = await handler(parsed.data)
    } catch (err) {
      pinoLogger.debug({ err }, 'Failed to check order status')
      status = null
    }
  } else {
    pinoLogger.warn({ err: parsed.error }, 'Invalid document id')
  }
  const ready = Boolean(status?.paid && status?.generated)

  return (
    <PageShell>
      <Card>
        <DownloadStatusPoller documentId={documentId} initialReady={ready} />
      </Card>
      <ReturnHomeLink />
    </PageShell>
  )
}
