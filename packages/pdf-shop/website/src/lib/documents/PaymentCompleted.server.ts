import 'server-only'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  type PaymentCompleted,
  type GetPayment,
  type CompletePayment,
  paymentCompletedSchema,
} from '@org/pdf-shop-contracts'
import { stripeClient } from './StripeClient'
import { StripeIntegrationFailed, FileIOFailed } from './errors'

const DATA_ROOT = process.env.PDF_SHOP_DATA_DIR
if (!DATA_ROOT) {
  throw new Error('PDF_SHOP_DATA_DIR environment variable must be set')
}

export const PAYMENT_INTENTS_DIR = path.join(DATA_ROOT, 'payment-intents')

export function paymentIntentFilePath(documentId: string) {
  return path.join(PAYMENT_INTENTS_DIR, `${documentId}.json`)
}

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

    const record: PaymentCompleted = {
      documentId: input.documentId,
      stripePaymentIntentId: intent.id,
      amount: intent.amount,
      currency: 'usd',
      confirmedAt: new Date().toISOString(),
    }
    try {
      await mkdir(PAYMENT_INTENTS_DIR, { recursive: true })
      await writeFile(
        paymentIntentFilePath(record.documentId),
        JSON.stringify(record, null, 2),
        'utf-8',
      )

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
    const raw = await readFile(paymentIntentFilePath(input.documentId), 'utf-8')
    return paymentCompletedSchema.parse(JSON.parse(raw))
  } catch (err) {
    throw new FileIOFailed('Failed to read payment intent file', err)
  }
}
