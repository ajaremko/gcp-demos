import 'server-only'
import path from 'node:path'

const DATA_ROOT = process.env.PDF_SHOP_DATA_DIR
if (!DATA_ROOT) {
  throw new Error('PDF_SHOP_DATA_DIR environment variable must be set')
}

export const DOCUMENT_SPECS_DIR = path.join(DATA_ROOT, 'document-specs')

export function documentSpecFilePath(specId: string) {
  return path.join(DOCUMENT_SPECS_DIR, `${specId}.json`)
}
