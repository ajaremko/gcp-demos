import 'server-only'
import path from 'node:path'

const DATA_ROOT = process.env.PDF_SHOP_DATA_DIR
if (!DATA_ROOT) {
  throw new Error('PDF_SHOP_DATA_DIR environment variable must be set')
}

// Subdirectories this app owns and writes to — names are our choice.
export const DOCUMENT_SPECS_DIR = path.join(DATA_ROOT, 'document-specs')
export const PAYMENT_CONFIRMATIONS_DIR = path.join(
  DATA_ROOT,
  'payment-confirmations',
)

// Subdirectory this app only ever reads — the name is an external contract
// (matches claude.md's example path shape). Do not rename without
// coordinating with the out-of-scope document-generation system.
export const GENERATED_DOCUMENTS_DIR = path.join(
  DATA_ROOT,
  'generated-documents',
)

export function documentSpecFilePath(specId: string) {
  return path.join(DOCUMENT_SPECS_DIR, `${specId}.json`)
}

export function paymentConfirmationFilePath(specId: string) {
  return path.join(PAYMENT_CONFIRMATIONS_DIR, `${specId}.json`)
}

export function generatedDocumentStatusFilePath(specId: string) {
  return path.join(GENERATED_DOCUMENTS_DIR, `${specId}.json`)
}
