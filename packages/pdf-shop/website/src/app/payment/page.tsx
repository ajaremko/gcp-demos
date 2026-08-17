import { redirect } from 'next/navigation'

import { GetPaymentContextHandler } from '@org/pdf-shop-application'

import { PageShell, Card, Heading, Subheading } from '@/lib/ui'
import { stripeClient } from '@/lib/stripe'
import { pinoLogger } from '@/lib/pino'
import { documentIdSchema } from '@/lib/schemas'

import { PaymentForm } from './CompletePaymentForm'
import { TestCards } from './TestCards'

const handler = GetPaymentContextHandler({
  stripe: stripeClient,
  dataRoot: process.env.DATA_ROOT ?? '',
  logger: pinoLogger,
})

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ documentId?: string }>
}) {
  const { documentId } = await searchParams
  if (!documentId) {
    redirect('/spec')
  }

  const parsed = documentIdSchema.safeParse({ documentId })
  if (!parsed.success) {
    redirect('/spec')
  }

  let document: Awaited<ReturnType<typeof handler>>
  try {
    document = await handler(parsed.data)
  } catch (error) {
    console.error(error)
    redirect('/spec')
  }

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!publishableKey) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set')
  }

  return (
    <PageShell>
      <Card>
        <Heading>Pay for &quot;{document.spec.title}&quot;</Heading>
        <Subheading>
          One-time purchase — sandbox mode, no real charge.
        </Subheading>
        {document.clientSecret && (
          <PaymentForm
            documentId={document.id}
            clientSecret={document.clientSecret}
            publishableKey={publishableKey}
          />
        )}
        <TestCards />
      </Card>
    </PageShell>
  )
}
