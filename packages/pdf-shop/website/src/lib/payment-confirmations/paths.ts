import 'server-only'
import path from 'node:path'

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
