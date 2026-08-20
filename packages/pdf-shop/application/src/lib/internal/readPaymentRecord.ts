import { readFile } from 'node:fs/promises'
import { type Logger } from 'pino'

import { ApplicationError } from '../ApplicationError'

import { type PaymentRecord, paymentRecordSchema } from './data/PaymentRecord'
import { buildRecordPath } from './data/recordPath'

/** The payment confirmation record (`paid.json`) could not be found. */
export class PaymentConfirmationNotFound extends ApplicationError {
  readonly tag = 'PaymentConfirmationNotFound'
  constructor(cause: unknown) {
    super('Payment confirmation file could not be found', cause)
  }
}

/** The payment confirmation record file is not valid JSON or fails schema validation. */
export class PaymentConfirmationInvalid extends ApplicationError {
  readonly tag = 'PaymentConfirmationInvalid'
  constructor(cause: unknown) {
    super('Payment confirmation file is invalid', cause)
  }
}

/**
 * Reads and validates a document's payment confirmation record (`paid.json`).
 *
 * @param env.dataRoot - Root directory where per-document records are stored.
 * @param env.logger - Logger; a child logger is created once per instantiation.
 * @returns An async function that takes `{documentId}` and resolves to the
 *   parsed {@link PaymentRecord}.
 * @throws {PaymentConfirmationNotFound} If the record file could not be found.
 * @throws {PaymentConfirmationInvalid} If the file is not valid JSON or fails schema validation.
 *
 * @example
 * const record = await readPaymentRecord({ dataRoot, logger })({
 *   documentId: '11111111-1111-4111-8111-111111111111',
 * })
 * // record.stripePaymentIntentId === 'pi_1'
 */
export function readPaymentRecord(env: { dataRoot: string; logger: Logger }) {
  const logger = env.logger.child({
    method: 'readPaymentRecord',
  })

  async function readRecord(documentId: string) {
    try {
      const recordPath = buildRecordPath(env.dataRoot, 'paid', documentId)
      logger.trace(
        { documentId, path: recordPath },
        'Reading payment confirmation file',
      )
      return await readFile(recordPath, 'utf-8')
    } catch (err) {
      logger.debug(
        { documentId, path: env.dataRoot },
        'Payment confirmation file could not be found',
      )
      throw new PaymentConfirmationNotFound(err)
    }
  }

  function parseRecord(raw: string): PaymentRecord {
    try {
      const record = JSON.parse(raw)
      return paymentRecordSchema.parse(record)
    } catch (err) {
      logger.debug('Payment confirmation file is invalid')
      throw new PaymentConfirmationInvalid(err)
    }
  }

  return async function (input: {
    documentId: string
  }): Promise<PaymentRecord> {
    const raw = await readRecord(input.documentId)
    return parseRecord(raw)
  }
}
