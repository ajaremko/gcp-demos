import 'server-only'
import path from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import {
  type CreateDocumentSpec,
  type DocumentSpecRecord,
  type GetDocumentSpec,
  documentSpecRecordSchema,
} from './DocumentSpecRecord'

const DATA_ROOT = process.env.PDF_SHOP_DATA_DIR
if (!DATA_ROOT) {
  throw new Error('PDF_SHOP_DATA_DIR environment variable must be set')
}

const DOCUMENT_SPECS_DIR = path.join(DATA_ROOT, 'document-specs')

function documentSpecFilePath(specId: string) {
  return path.join(DOCUMENT_SPECS_DIR, `${specId}.json`)
}

export async function createDocumentSpec(
  input: CreateDocumentSpec,
): Promise<DocumentSpecRecord> {
  const record: DocumentSpecRecord = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  }

  await mkdir(DOCUMENT_SPECS_DIR, { recursive: true })
  await writeFile(
    documentSpecFilePath(record.id),
    JSON.stringify(record, null, 2),
    'utf-8',
  )

  return record
}

export async function getDocumentSpec(
  input: GetDocumentSpec,
): Promise<DocumentSpecRecord | null> {
  try {
    const raw = await readFile(documentSpecFilePath(input.specId), 'utf-8')
    return documentSpecRecordSchema.parse(JSON.parse(raw))
  } catch {
    return null
  }
}
