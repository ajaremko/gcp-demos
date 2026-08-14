'use server'
import { redirect } from 'next/navigation'
import { stripeClient } from './StripeClient'
import { createPaymentConfirmation } from './PaymentConfirmationRecord.server'

export type ConfirmPaymentState = {
  error?: string
}

export async function confirmPaymentAction(
  _prevState: ConfirmPaymentState,
  input: { specId: string; paymentIntentId: string },
): Promise<ConfirmPaymentState> {
  // Never trust the client-reported status — re-verify against Stripe.
  const intent = await stripeClient.paymentIntents.retrieve(
    input.paymentIntentId,
  )

  if (
    intent.status !== 'succeeded' ||
    intent.metadata.documentSpecId !== input.specId
  ) {
    return { error: 'Payment could not be verified. Please try again.' }
  }

  await createPaymentConfirmation({
    documentSpecId: input.specId,
    stripePaymentIntentId: intent.id,
    amount: intent.amount,
    currency: 'usd',
  })

  redirect(`/download?specId=${input.specId}`)
}
