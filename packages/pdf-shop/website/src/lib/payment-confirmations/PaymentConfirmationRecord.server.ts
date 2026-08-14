import 'server-only'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import {
  type PaymentConfirmationRecord,
  paymentConfirmationRecordSchema,
} from './PaymentConfirmationRecord'

const DATA_ROOT = process.env.PDF_SHOP_DATA_DIR
if (!DATA_ROOT) {
  throw new Error('PDF_SHOP_DATA_DIR environment variable must be set')
}

export const PAYMENT_CONFIRMATIONS_DIR = path.join(
  DATA_ROOT,
  'payment-confirmations',
)

export function paymentConfirmationFilePath(specId: string) {
  return path.join(PAYMENT_CONFIRMATIONS_DIR, `${specId}.json`)
}

export async function createPaymentConfirmation(input: {
  documentSpecId: string
  stripePaymentIntentId: string
  amount: number
  currency: 'usd'
}): Promise<PaymentConfirmationRecord> {
  const record: PaymentConfirmationRecord = {
    ...input,
    paymentConfirmationId: randomUUID(),
    status: 'succeeded',
    confirmedAt: new Date().toISOString(),
  }

  await mkdir(PAYMENT_CONFIRMATIONS_DIR, { recursive: true })
  await writeFile(
    paymentConfirmationFilePath(record.documentSpecId),
    JSON.stringify(record, null, 2),
    'utf-8',
  )

  return record
}

export async function getPaymentConfirmation(
  specId: string,
): Promise<PaymentConfirmationRecord | null> {
  try {
    const raw = await readFile(paymentConfirmationFilePath(specId), 'utf-8')
    return paymentConfirmationRecordSchema.parse(JSON.parse(raw))
  } catch {
    return null
  }
}
