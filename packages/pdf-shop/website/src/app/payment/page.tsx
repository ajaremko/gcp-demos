import { redirect } from 'next/navigation'

import { handleGetDocumentPayment } from '@org/pdf-shop-application'

import { PageShell, Card, Heading, Subheading } from '@/lib/ui'
import { stripeClient } from '@/lib/stripe'

import { PaymentForm } from './CompletePaymentForm'
import { TestCards } from './TestCards'

const handler = handleGetDocumentPayment({
  stripe: stripeClient,
  dataRoot: process.env.DATA_ROOT ?? '',
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

  let document: Awaited<ReturnType<typeof handler>>
  try {
    document = await handler({ documentId })
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
