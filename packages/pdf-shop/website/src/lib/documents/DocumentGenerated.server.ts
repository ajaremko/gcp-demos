import 'server-only'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'
import {
  type DocumentGenerated,
  type GenerateDocument,
  type GetGeneratedDocumentStream,
  type GetGeneratedDocument,
  documentGeneratedSchema,
} from '@org/pdf-shop-contracts'
import { FileIOFailed } from './errors'

const DATA_ROOT = process.env.PDF_SHOP_DATA_DIR
if (!DATA_ROOT) {
  throw new Error('PDF_SHOP_DATA_DIR environment variable must be set')
}

export const GENERATED_DOCUMENTS_DIR = path.join(
  DATA_ROOT,
  'generated-documents',
)

export function generatedDocumentFilePath(documentId: string) {
  return path.join(GENERATED_DOCUMENTS_DIR, `${documentId}.txt`)
}

export const DOCUMENTS_DIR = path.join(DATA_ROOT, 'generated-documents')

export function documentFilePath(documentId: string) {
  return path.join(DOCUMENTS_DIR, `${documentId}.json`)
}

export async function generateDocument(
  input: GenerateDocument,
): Promise<DocumentGenerated> {
  try {
    await mkdir(GENERATED_DOCUMENTS_DIR, { recursive: true })
    const generatedDocumentPath = generatedDocumentFilePath(input.documentId)
    await writeFile(
      generatedDocumentPath,
      `Generated document for spec ${input.documentId}\n\n${JSON.stringify(input.spec, null, 2)}`,
      'utf-8',
    )

    const record: DocumentGenerated = {
      documentId: input.documentId,
      path: generatedDocumentPath,
      filename: `${input.documentId}.txt`,
      contentType: 'text/plain',
      timestamp: new Date().toISOString(),
    }

    await mkdir(DOCUMENTS_DIR, { recursive: true })

    const eventPath = documentFilePath(input.documentId)
    await writeFile(eventPath, JSON.stringify(record, null, 2), 'utf-8')

    return record
  } catch (err) {
    throw new FileIOFailed('Failed to generate document', err)
  }
}

export async function getGeneratedDocument(input: GetGeneratedDocument) {
  try {
    const eventPath = documentFilePath(input.documentId)
    const raw = await readFile(eventPath, 'utf-8')
    return documentGeneratedSchema.parse(JSON.parse(raw))
  } catch (err) {
    throw new FileIOFailed('Failed to read generated document file', err)
  }
}

export async function getGeneratedDocumentStream(
  input: GetGeneratedDocumentStream,
) {
  try {
    const { size } = await stat(input.path)
    if (!size) {
      throw new Error('File is empty')
    }
    return { stream: createReadStream(input.path), size }
  } catch (err) {
    throw new FileIOFailed('Failed to read generated document stream', err)
  }
}
