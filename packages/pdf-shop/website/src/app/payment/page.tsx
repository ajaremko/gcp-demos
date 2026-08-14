import { notFound, redirect } from 'next/navigation'
import { PageShell, Card, Heading, Subheading } from '@/lib/shared/ui'
import { getDocumentSpec } from '@/lib/document-specs/DocumentSpecRecord.server'
import { getOrCreatePaymentIntent } from '@/lib/payment-confirmations/PaymentIntent.server'
import { PaymentForm } from '@/lib/payment-confirmations/PaymentForm'
import { TestCards } from './test-cards'

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ specId?: string }>
}) {
  const { specId } = await searchParams
  if (!specId) {
    redirect('/spec')
  }

  const spec = await getDocumentSpec({ specId })
  if (!spec) {
    notFound()
  }

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!publishableKey) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set')
  }

  const paymentIntent = await getOrCreatePaymentIntent(specId)
  if (!paymentIntent.client_secret) {
    throw new Error(
      'Stripe did not return a client secret for this PaymentIntent',
    )
  }

  return (
    <PageShell>
      <Card>
        <Heading>Pay for &quot;{spec.title}&quot;</Heading>
        <Subheading>
          One-time purchase — sandbox mode, no real charge.
        </Subheading>
        <PaymentForm
          specId={specId}
          clientSecret={paymentIntent.client_secret}
          publishableKey={publishableKey}
        />
        <TestCards />
      </Card>
    </PageShell>
  )
}
