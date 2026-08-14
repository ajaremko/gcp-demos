import { notFound, redirect } from 'next/navigation'
import { PageShell, Card, Heading, Subheading } from '@/lib/shared/ui'
import {
  getDocumentCreated,
  getPaymentIntentClientSecret,
} from '@/lib/documents/DocumentCreated.server'
import { PaymentForm } from '@/lib/documents/CompletePaymentForm'
import { TestCards } from './test-cards'

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ documentId?: string }>
}) {
  const { documentId } = await searchParams
  if (!documentId) {
    redirect('/spec')
  }

  const document = await getDocumentCreated({ documentId })
  if (!document) {
    notFound()
  }

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!publishableKey) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set')
  }

  const clientSecret = await getPaymentIntentClientSecret(
    document.payment.paymentIntentId,
  )
  if (!clientSecret) {
    notFound()
  }

  return (
    <PageShell>
      <Card>
        <Heading>Pay for &quot;{document.spec.title}&quot;</Heading>
        <Subheading>
          One-time purchase — sandbox mode, no real charge.
        </Subheading>
        <PaymentForm
          documentId={documentId}
          clientSecret={clientSecret}
          publishableKey={publishableKey}
        />
        <TestCards />
      </Card>
    </PageShell>
  )
}
