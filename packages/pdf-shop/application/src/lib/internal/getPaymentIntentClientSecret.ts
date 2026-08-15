import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import { StripeIntegrationFailed } from './errors'

export function getPaymentIntentClientSecret(env: {
  stripe: Stripe
  logger: Logger
}) {
  return async function (intentId: string) {
    const logger = env.logger.child({
      method: 'getPaymentIntentClientSecret',
      paymentIntentId: intentId,
    })

    try {
      logger.trace({}, 'Retrieving payment intent from Stripe')
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
