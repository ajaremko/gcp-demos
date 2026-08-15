import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { type Logger } from 'pino'

import {
  type PaymentCompleted,
  type GetPayment,
  encodeDocumentPath,
  paymentCompletedSchema,
} from '@org/pdf-shop-contracts'

import { FileIOFailed } from './errors'

export function getPaymentCompleted(env: { dataRoot: string; logger: Logger }) {
  return async function (input: GetPayment): Promise<PaymentCompleted> {
    const logger = env.logger.child({
      method: 'getPaymentCompleted',
      documentId: input.documentId,
    })

    try {
      const documentPath = encodeDocumentPath({
        documentId: input.documentId,
        version: 1,
      })

      logger.trace({}, 'Reading payment confirmation file')
      const recordPath = path.join(env.dataRoot, documentPath, 'paid.json')
      const recordData = await readFile(recordPath, 'utf-8')

      const record = JSON.parse(recordData)
      return paymentCompletedSchema.parse(record)
    } catch (err) {
      throw new FileIOFailed('Failed to read payment confirmation file', err)
    }
  }
}
