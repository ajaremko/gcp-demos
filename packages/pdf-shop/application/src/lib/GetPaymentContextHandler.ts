import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import { type DocumentSpec } from './internal/data/DocumentSpec'
import { readOrderRecord } from './internal/readOrderRecord'
import { retreiveClientSecret } from './internal/retreiveClientSecret'

export interface GetPaymentContext {
  documentId: string
}

export interface PaymentContextView {
  documentId: string
  clientSecret: string | null
  spec: DocumentSpec
}

/**
 * Assembles what a customer needs to complete a document's payment: the
 * document's content spec and a Stripe client secret for authorizing the
 * outstanding charge.
 *
 * @param env.dataRoot - Root directory where per-document records are stored.
 * @param env.stripe - Stripe client used to retrieve the payment intent's client secret.
 * @param env.logger - Logger; a child logger scoped to this handler (including
 *   `documentId`) is created per call.
 * @returns An async function that takes a {@link GetPaymentContext}
 *   (`documentId`) and resolves to a {@link PaymentContextView}: the document's
 *   `id`, its Stripe `clientSecret` (`null` if not yet available), and its `spec`.
 * @throws {DocumentOrderNotFound} If the order record cannot be found.
 * @throws {DocumentOrderInvalid} If the order record is invalid.
 * @throws {PaymentIntentRetrievalFailed} If Stripe fails to retrieve the payment intent.
 *
 * @example
 * const context = await GetPaymentContextHandler({ stripe, dataRoot, logger })({
 *   documentId: '11111111-1111-4111-8111-111111111111',
 * })
 * // context.clientSecret === 'secret_123'
 */
export function GetPaymentContextHandler(env: {
  dataRoot: string
  stripe: Stripe
  logger: Logger
}) {
  return async function (
    input: GetPaymentContext,
  ): Promise<PaymentContextView> {
    const { documentId } = input
    const logger = env.logger.child({
      handler: 'GetPaymentContextHandler',
      documentId,
    })
    const localEnv = { ...env, logger }

    const document = await readOrderRecord(localEnv)({ documentId })
    const clientSecret = await retreiveClientSecret(localEnv)(
      document.payment.paymentIntentId,
    )

    return {
      documentId: document.id,
      clientSecret,
      spec: document.spec,
    }
  }
}
