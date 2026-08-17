import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { type Logger } from 'pino'

import { type PaymentRecord, paymentRecordSchema } from './data/PaymentRecord'
import { ApplicationError } from '../ApplicationError'

type GetPayment = {
  documentId: string
}

export class PaymentConfirmationNotFound extends ApplicationError {
  readonly tag = 'PaymentConfirmationNotFound'
  constructor(cause: unknown) {
    super('Payment confirmation file could not be found', cause)
  }
}

export class PaymentConfirmationInvalid extends ApplicationError {
  readonly tag = 'PaymentConfirmationInvalid'
  constructor(cause: unknown) {
    super('Payment confirmation file is invalid', cause)
  }
}

export function readPaymentRecord(env: { dataRoot: string; logger: Logger }) {
  const logger = env.logger.child({
    method: 'readPaymentRecord',
  })

  async function readRecord(documentId: string) {
    try {
      const recordPath = path.join(env.dataRoot, documentId, 'paid.json')
      logger.trace(
        { documentId, path: recordPath },
        'Reading payment confirmation file',
      )
      return await readFile(recordPath, 'utf-8')
    } catch (err) {
      throw new PaymentConfirmationNotFound(err)
    }
  }

  function parseRecord(raw: string): PaymentRecord {
    try {
      const record = JSON.parse(raw)
      return paymentRecordSchema.parse(record)
    } catch (err) {
      throw new PaymentConfirmationInvalid(err)
    }
  }

  return async function (input: GetPayment): Promise<PaymentRecord> {
    const raw = await readRecord(input.documentId)
    return parseRecord(raw)
  }
}
