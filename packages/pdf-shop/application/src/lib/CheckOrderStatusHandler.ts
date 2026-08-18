import { type Logger } from 'pino'

import { readGenerationRecord } from './internal/readGenerationRecord'
import { readPaymentRecord } from './internal/readPaymentRecord'

export interface CheckOrderStatus {
  documentId: string
}

/**
 * Reports whether a document's order has reached "ready": its content has
 * been generated and its payment confirmed.
 *
 * @param env.dataRoot - Root directory where per-document records are stored.
 * @param env.logger - Logger; a child logger scoped to this handler (including
 *   `documentId`) is created per call.
 * @returns An async function that takes a {@link CheckOrderStatus}
 *   (`documentId`) and resolves to `true` once both records exist — otherwise
 *   it rejects, which callers typically treat as "not ready yet" rather than
 *   a hard failure.
 * @throws {GeneratedDocumentRecordNotFound} If the document has not been generated yet.
 * @throws {GeneratedDocumentRecordInvalid} If the generation record is invalid.
 * @throws {PaymentConfirmationNotFound} If the document has not been paid for yet.
 * @throws {PaymentConfirmationInvalid} If the payment confirmation record is invalid.
 *
 * @example
 * const ready = await CheckOrderStatusHandler({ dataRoot, logger })({
 *   documentId: '11111111-1111-4111-8111-111111111111',
 * })
 * // ready === true
 */
export function CheckOrderStatusHandler(env: {
  dataRoot: string
  logger: Logger
}) {
  return async function (input: CheckOrderStatus) {
    const { documentId } = input
    const logger = env.logger.child({
      handler: 'CheckOrderStatusHandler',
      documentId,
    })
    const localEnv = { ...env, logger }
    await readGenerationRecord(localEnv)({ documentId })
    await readPaymentRecord(localEnv)({ documentId })
    return true
  }
}
