import 'server-only'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { PAYMENT_CONFIRMATIONS_DIR, paymentConfirmationFilePath } from './paths'
import {
  type PaymentConfirmationRecord,
  paymentConfirmationRecordSchema,
} from './schemas'

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
