import { type Logger } from 'pino'

import {
  readGenerationRecord,
  GeneratedDocumentRecordNotFound,
} from './internal/readGenerationRecord'
import {
  readPaymentRecord,
  PaymentConfirmationNotFound,
} from './internal/readPaymentRecord'

export interface CheckOrderStatus {
  documentId: string
}

export interface OrderStatus {
  paid: boolean
  generated: boolean
}

/**
 * Reports whether a document's order has been paid for and whether its
 * content has been generated — the two are independent, since generation
 * is triggered by the order becoming durable in storage, not by payment.
 *
 * @param env.dataRoot - Root directory where per-document records are stored.
 * @param env.logger - Logger; a child logger scoped to this handler (including
 *   `documentId`) is created per call.
 * @returns An async function that takes a {@link CheckOrderStatus}
 *   (`documentId`) and resolves to an {@link OrderStatus}.
 * @throws {GeneratedDocumentRecordInvalid} If the generation record exists but is invalid.
 * @throws {PaymentConfirmationInvalid} If the payment confirmation record exists but is invalid.
 *
 * @example
 * const status = await CheckOrderStatusHandler({ dataRoot, logger })({
 *   documentId: '11111111-1111-4111-8111-111111111111',
 * })
 * // status === { paid: true, generated: false }
 */
export function CheckOrderStatusHandler(env: {
  dataRoot: string
  logger: Logger
}) {
  return async function (input: CheckOrderStatus): Promise<OrderStatus> {
    const { documentId } = input
    const logger = env.logger.child({
      handler: 'CheckOrderStatusHandler',
      documentId,
    })
    const localEnv = { ...env, logger }

    const [generated, paid] = await Promise.all([
      readGenerationRecord(localEnv)({ documentId })
        .then(() => true)
        .catch((err) => {
          if (err instanceof GeneratedDocumentRecordNotFound) return false
          throw err
        }),
      readPaymentRecord(localEnv)({ documentId })
        .then(() => true)
        .catch((err) => {
          if (err instanceof PaymentConfirmationNotFound) return false
          throw err
        }),
    ])

    return { paid, generated }
  }
}
