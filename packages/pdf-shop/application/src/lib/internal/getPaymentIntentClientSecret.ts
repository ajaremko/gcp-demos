import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import { ApplicationError } from '../ApplicationError'

export class PaymentIntentRetrievalFailed extends ApplicationError {
  readonly tag = 'PaymentIntentRetrievalFailed'
  constructor(cause: unknown) {
    super('Failed to retrieve payment intent from Stripe', cause)
  }
}

export function getPaymentIntentClientSecret(env: {
  stripe: Stripe
  logger: Logger
}) {
  return async function (intentId: string): Promise<string | null> {
    const logger = env.logger.child({
      method: 'getPaymentIntentClientSecret',
      paymentIntentId: intentId,
    })

    try {
      logger.trace({}, 'Retrieving payment intent from Stripe')
      const intent = await env.stripe.paymentIntents.retrieve(intentId)
      return intent.client_secret ?? null
    } catch (err) {
      throw new PaymentIntentRetrievalFailed(err)
    }
  }
}
