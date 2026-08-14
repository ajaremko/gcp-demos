import 'server-only'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  type PaymentCompleted,
  type GetPayment,
  type CompletePayment,
  encodeDocumentPath,
  paymentCompletedSchema,
} from '@org/pdf-shop-contracts'
import { stripeClient } from './StripeClient'
import { StripeIntegrationFailed, FileIOFailed } from './errors'

const DATA_ROOT = (() => {
  const DATA_ROOT = process.env.PDF_SHOP_DATA_DIR
  if (!DATA_ROOT) {
    throw new Error('PDF_SHOP_DATA_DIR environment variable must be set')
  }
  return DATA_ROOT
})()

export async function completePayment(
  input: CompletePayment,
): Promise<PaymentCompleted> {
  try {
    const intent = await stripeClient.paymentIntents.retrieve(
      input.paymentIntentId,
    )

    if (
      intent.status !== 'succeeded' ||
      intent.metadata.documentId !== input.documentId
    ) {
      throw new Error(
        'Payment was not successful or does not match the document ID',
      )
    }

    try {
      // Prepare output directory
      const documentPath = encodeDocumentPath({
        documentId: input.documentId,
        version: 1,
      })
      const outputDir = path.join(DATA_ROOT, documentPath)
      await mkdir(outputDir, { recursive: true })

      const record: PaymentCompleted = {
        documentId: input.documentId,
        stripePaymentIntentId: intent.id,
        amount: intent.amount,
        currency: 'usd',
        confirmedAt: new Date().toISOString(),
      }

      const recordData = JSON.stringify(record, null, 2)
      const recordPath = path.join(outputDir, 'paid.json')
      await writeFile(recordPath, recordData, 'utf-8')

      return record
    } catch (err) {
      throw new FileIOFailed('Failed to write payment intent file', err)
    }
  } catch (err) {
    throw new StripeIntegrationFailed('Failed to verify payment intent', err)
  }
}

export async function getPaymentCompleted(
  input: GetPayment,
): Promise<PaymentCompleted> {
  try {
    const documentPath = encodeDocumentPath({
      documentId: input.documentId,
      version: 1,
    })

    const recordPath = path.join(DATA_ROOT, documentPath, 'paid.json')
    const recordData = await readFile(recordPath, 'utf-8')

    const record = JSON.parse(recordData)
    return paymentCompletedSchema.parse(record)
  } catch (err) {
    throw new FileIOFailed('Failed to read payment confirmation file', err)
  }
}
