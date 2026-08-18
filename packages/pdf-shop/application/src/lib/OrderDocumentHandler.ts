import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import { orderDocument } from './internal/orderDocument'

export interface OrderDocument {
  colorScheme: 'light' | 'dark'
  title: string
  body: string
}

/**
 * Places an order for a new document: captures the requested content and
 * styling, opens payment for the fixed price, and reserves the order under
 * a newly assigned document id, pending payment and generation.
 *
 * @param env.stripe - Stripe client used to create the payment intent.
 * @param env.dataRoot - Root directory where per-document records are stored.
 * @param env.logger - Logger; a child logger scoped to this handler is created per call.
 * @returns An async function that takes an {@link OrderDocument} (`colorScheme`,
 *   `title`, `body`) and resolves to the newly written order record.
 * @throws {PaymentIntentCreationFailed} If Stripe fails to create the payment intent.
 * @throws {OrderRecordWriteFailed} If the order record cannot be written to disk.
 *
 * @example
 * const record = await OrderDocumentHandler({ stripe, dataRoot, logger })({
 *   colorScheme: 'light',
 *   title: 'Test',
 *   body: 'Body',
 * })
 * // record.id === '11111111-1111-4111-8111-111111111111'
 */
export function OrderDocumentHandler(env: {
  stripe: Stripe
  dataRoot: string
  logger: Logger
}) {
  return async function (input: OrderDocument) {
    const logger = env.logger.child({ handler: 'OrderDocumentHandler' })
    const localEnv = { ...env, logger }
    const document = await orderDocument(localEnv)(input)
    return document
  }
}
