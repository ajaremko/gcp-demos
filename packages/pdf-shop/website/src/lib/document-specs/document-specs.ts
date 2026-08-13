import 'server-only'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { DOCUMENT_SPECS_DIR, documentSpecFilePath } from './paths'
import {
  type DocumentSpecFormValues,
  type DocumentSpecRecord,
  documentSpecRecordSchema,
} from './schemas'

export async function createDocumentSpec(
  input: DocumentSpecFormValues,
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
  specId: string,
): Promise<DocumentSpecRecord | null> {
  try {
    const raw = await readFile(documentSpecFilePath(specId), 'utf-8')
    return documentSpecRecordSchema.parse(JSON.parse(raw))
  } catch {
    return null
  }
}
