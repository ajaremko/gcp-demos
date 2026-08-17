import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { type Logger } from 'pino'

import { type PaymentCompleted, paymentCompletedSchema } from './records'
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

export function getPaymentCompleted(env: { dataRoot: string; logger: Logger }) {
  const logger = env.logger.child({
    method: 'getPaymentCompleted',
  })

  async function readPaymentConfirmationFile(documentId: string) {
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

  function parsePaymentConfirmation(raw: string): PaymentCompleted {
    try {
      const record = JSON.parse(raw)
      return paymentCompletedSchema.parse(record)
    } catch (err) {
      throw new PaymentConfirmationInvalid(err)
    }
  }

  return async function (input: GetPayment): Promise<PaymentCompleted> {
    const raw = await readPaymentConfirmationFile(input.documentId)
    return parsePaymentConfirmation(raw)
  }
}
