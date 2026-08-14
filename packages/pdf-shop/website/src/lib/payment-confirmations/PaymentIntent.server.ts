import 'server-only'
import type Stripe from 'stripe'
import { stripeClient } from './StripeClient'

export const DEMO_PRICE_CENTS = 999
export const DEMO_PRICE_CURRENCY = 'usd'

// Idempotency-keyed by specId so reloading the payment page never creates a
// duplicate PaymentIntent — no separate spec-to-intent mapping file needed.
export async function getOrCreatePaymentIntent(
  specId: string,
): Promise<Stripe.Response<Stripe.PaymentIntent>> {
  return stripeClient.paymentIntents.create(
    {
      amount: DEMO_PRICE_CENTS,
      currency: DEMO_PRICE_CURRENCY,
      automatic_payment_methods: { enabled: true },
      metadata: { documentSpecId: specId },
    },
    { idempotencyKey: `pdf-shop-payment-intent-${specId}` },
  )
}
