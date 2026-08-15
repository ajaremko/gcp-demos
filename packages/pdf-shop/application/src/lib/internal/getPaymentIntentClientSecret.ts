import { type Stripe } from 'stripe'

import { StripeIntegrationFailed } from './errors'

export function getPaymentIntentClientSecret(env: { stripe: Stripe }) {
  return async function (intentId: string) {
    try {
      const intent = await env.stripe.paymentIntents.retrieve(intentId)
      return intent.client_secret ?? null
    } catch (err) {
      throw new StripeIntegrationFailed(
        'Failed to retrieve payment intent from Stripe',
        err,
      )
    }
  }
}
