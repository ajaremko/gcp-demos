import { redirect } from 'next/navigation'

import { GetPaymentContextHandler } from '@org/pdf-shop-application'

import { PageShell, Card, Heading, Subheading } from '@/lib/ui'
import { getStripeClient } from '@/lib/stripe'
import { pinoLogger } from '@/lib/pino'
import { resolveDataRoot } from '@/lib/dataRoot'
import { documentIdSchema } from '@/lib/schemas'

import { PurchaseDocumentForm } from './PurchaseDocumentForm'
import { TestCards } from './TestCards'

export default async function PurchasePage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string }>
}) {
  const { doc: documentId } = await searchParams
  if (!documentId) {
    redirect('/create')
  }

  const parsed = documentIdSchema.safeParse({ documentId })
  if (!parsed.success) {
    redirect('/create')
  }

  const handler = GetPaymentContextHandler({
    stripe: getStripeClient(),
    dataRoot: resolveDataRoot(),
    logger: pinoLogger,
  })

  let document: Awaited<ReturnType<typeof handler>>
  try {
    document = await handler(parsed.data)
  } catch (error) {
    pinoLogger.debug({ err: error }, 'Failed to load payment context')
    redirect('/create')
  }

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!publishableKey) {
    const err = new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set')
    pinoLogger.fatal({ err }, 'Missing required configuration')
    throw err
  }

  return (
    <PageShell>
      <Card>
        <Heading>Pay for &quot;{document.spec.title}&quot;</Heading>
        <Subheading>
          One-time purchase — sandbox mode, no real charge.
        </Subheading>
        {document.clientSecret && (
          <PurchaseDocumentForm
            documentId={document.documentId}
            clientSecret={document.clientSecret}
            publishableKey={publishableKey}
          />
        )}
        <TestCards />
      </Card>
    </PageShell>
  )
}
