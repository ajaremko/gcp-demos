import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import { ApplicationError } from '../ApplicationError'

/** Stripe failed to retrieve the payment intent. */
export class PaymentIntentRetrievalFailed extends ApplicationError {
  readonly tag = 'PaymentIntentRetrievalFailed'
  constructor(cause: unknown) {
    super('Failed to retrieve payment intent from Stripe', cause)
  }
}

/**
 * Retrieves a Stripe payment intent's client secret, needed by the frontend
 * to confirm payment.
 *
 * @param env.stripe - Stripe client used to retrieve the payment intent.
 * @param env.logger - Logger.
 * @returns An async function that takes a bare `intentId` (unlike its sibling
 *   internal functions, not an object) and resolves to the intent's
 *   `client_secret`, or `null` if the intent doesn't have one yet.
 * @throws {PaymentIntentRetrievalFailed} If Stripe fails to retrieve the payment intent.
 *
 * @example
 * const clientSecret = await retreiveClientSecret({ stripe, logger })('pi_1')
 * // clientSecret === 'secret_123', or null if not yet available
 */
export function retreiveClientSecret(env: { stripe: Stripe; logger: Logger }) {
  return async function (intentId: string): Promise<string | null> {
    try {
      const logger = env.logger.child({
        method: 'retreiveClientSecret',
        paymentIntentId: intentId,
      })
      logger.trace('Retrieving payment intent from Stripe')
      const intent = await env.stripe.paymentIntents.retrieve(intentId)
      const clientSecret = intent.client_secret ?? null
      return clientSecret
    } catch (err) {
      throw new PaymentIntentRetrievalFailed(err)
    }
  }
}
