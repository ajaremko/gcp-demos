import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import { purchaseDocument } from './internal/purchaseDocument'

export interface PurchaseDocument {
  documentId: string
  paymentIntentId: string
}

/**
 * Confirms that a document's order has been paid for: verifies the outcome
 * of the customer's Stripe payment and records the purchase against the document.
 *
 * @param env.stripe - Stripe client used to retrieve the payment intent.
 * @param env.dataRoot - Root directory where per-document records are stored.
 * @param env.logger - Logger; a child logger scoped to this handler (including
 *   `documentId`/`paymentIntentId`) is created per call.
 * @returns An async function that takes a {@link PurchaseDocument}
 *   (`documentId`, `paymentIntentId`) and resolves to `{documentId}` once the
 *   payment confirmation record has been written.
 * @throws {PaymentIntentNotFound} If Stripe fails to retrieve the payment intent.
 * @throws {PaymentIntentInvalid} If the intent did not succeed, or its
 *   metadata doesn't match the document being purchased.
 * @throws {PaymentRecordWriteFailed} If the payment confirmation record cannot be written to disk.
 *
 * @example
 * const { documentId } = await PurchaseDocumentHandler({ stripe, dataRoot, logger })({
 *   documentId: '11111111-1111-4111-8111-111111111111',
 *   paymentIntentId: 'pi_1',
 * })
 */
export function PurchaseDocumentHandler(env: {
  stripe: Stripe
  dataRoot: string
  logger: Logger
}) {
  return async function (input: PurchaseDocument) {
    const { documentId, paymentIntentId } = input
    const logger = env.logger.child({
      handler: 'PurchaseDocumentHandler',
      documentId,
      paymentIntentId,
    })
    const localEnv = { ...env, logger }
    await purchaseDocument(localEnv)({ documentId, paymentIntentId })
    return { documentId }
  }
}
