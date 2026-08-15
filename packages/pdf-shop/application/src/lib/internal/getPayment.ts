import { readFile } from 'node:fs/promises'
import path from 'node:path'

import {
  type PaymentCompleted,
  type GetPayment,
  encodeDocumentPath,
  paymentCompletedSchema,
} from '@org/pdf-shop-contracts'

import { FileIOFailed } from './errors'

export function getPaymentCompleted(env: { dataRoot: string }) {
  return async function (input: GetPayment): Promise<PaymentCompleted> {
    try {
      const documentPath = encodeDocumentPath({
        documentId: input.documentId,
        version: 1,
      })

      const recordPath = path.join(env.dataRoot, documentPath, 'paid.json')
      const recordData = await readFile(recordPath, 'utf-8')

      const record = JSON.parse(recordData)
      return paymentCompletedSchema.parse(record)
    } catch (err) {
      throw new FileIOFailed('Failed to read payment confirmation file', err)
    }
  }
}
