import 'server-only'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  type PaymentCompleted,
  type GetPayment,
  type CompletePayment,
  paymentCompletedSchema,
} from './PaymentCompleted'
import { stripeClient } from './StripeClient'

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
  const intent = await stripeClient.paymentIntents.retrieve(
    input.paymentIntentId,
  )

  if (
    intent.status !== 'succeeded' ||
    intent.metadata.documentId !== input.documentId
  ) {
    throw new Error('Payment could not be verified. Please try again.')
  }

  const record: PaymentCompleted = {
    documentId: input.documentId,
    stripePaymentIntentId: intent.id,
    amount: intent.amount,
    currency: 'usd',
    confirmedAt: new Date().toISOString(),
  }

  await mkdir(PAYMENT_INTENTS_DIR, { recursive: true })
  await writeFile(
    paymentIntentFilePath(record.documentId),
    JSON.stringify(record, null, 2),
    'utf-8',
  )

  return record
}

export async function getPaymentCompleted(
  input: GetPayment,
): Promise<PaymentCompleted | null> {
  try {
    const raw = await readFile(paymentIntentFilePath(input.documentId), 'utf-8')
    return paymentCompletedSchema.parse(JSON.parse(raw))
  } catch {
    return null
  }
}
