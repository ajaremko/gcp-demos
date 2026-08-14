import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import {
  type GeneratedDocumentStatus,
  generatedDocumentStatusSchema,
} from './GeneratedDocumentStatus'

const DATA_ROOT = process.env.PDF_SHOP_DATA_DIR
if (!DATA_ROOT) {
  throw new Error('PDF_SHOP_DATA_DIR environment variable must be set')
}

// Subdirectory this app only ever reads — the name is an external contract
// (matches claude.md's example path shape). Do not rename without
// coordinating with the out-of-scope document-generation system.
const GENERATED_DOCUMENTS_DIR = path.join(DATA_ROOT, 'generated-documents')

function generatedDocumentStatusFilePath(specId: string) {
  return path.join(GENERATED_DOCUMENTS_DIR, `${specId}.json`)
}

// Read-only: this file is written by an out-of-scope external system. Any
// parse failure (missing file, malformed JSON, schema mismatch) is treated
// the same as "not ready yet" rather than an error, since we don't control
// the writer.
export async function getGeneratedDocumentStatus(
  specId: string,
): Promise<GeneratedDocumentStatus | null> {
  try {
    const raw = await readFile(generatedDocumentStatusFilePath(specId), 'utf-8')
    const parsed = generatedDocumentStatusSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) {
      console.warn(
        `generated-documents/${specId}.json failed schema validation`,
        parsed.error,
      )
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}
