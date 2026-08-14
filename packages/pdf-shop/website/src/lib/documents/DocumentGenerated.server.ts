import 'server-only'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'
import {
  type DocumentGenerated,
  type GenerateDocument,
  type GetGeneratedDocumentStream,
  type GetGeneratedDocument,
  encodeDocumentPath,
  documentGeneratedSchema,
} from '@org/pdf-shop-contracts'
import { FileIOFailed } from './errors'

const DATA_ROOT = (() => {
  const DATA_ROOT = process.env.PDF_SHOP_DATA_DIR
  if (!DATA_ROOT) {
    throw new Error('PDF_SHOP_DATA_DIR environment variable must be set')
  }
  return DATA_ROOT
})()

export async function generateDocument(
  input: GenerateDocument,
): Promise<DocumentGenerated> {
  try {
    // Prepare output directory
    const documentPath = encodeDocumentPath({
      documentId: input.documentId,
      version: 1,
    })
    const outputDir = path.join(DATA_ROOT, documentPath)
    await mkdir(outputDir, { recursive: true })

    // Generate and write document content
    const generatedData = `Generated document for spec ${input.documentId}\n\n${JSON.stringify(input.spec, null, 2)}`
    const generatedPath = path.join(outputDir, `generated.txt`)
    await writeFile(generatedPath, generatedData, 'utf-8')

    // Write a record of the generated document
    const record: DocumentGenerated = {
      documentId: input.documentId,
      path: documentPath,
      filename: `${input.documentId}.txt`,
      contentType: 'text/plain',
      timestamp: new Date().toISOString(),
    }

    const recordData = JSON.stringify(record, null, 2)
    const recordPath = path.join(outputDir, 'generated.json')
    await writeFile(recordPath, recordData, 'utf-8')

    return record
  } catch (err) {
    throw new FileIOFailed('Failed to generate document', err)
  }
}

export async function getGeneratedDocument(input: GetGeneratedDocument) {
  try {
    const documentPath = encodeDocumentPath({
      documentId: input.documentId,
      version: 1,
    })

    const recordPath = path.join(DATA_ROOT, documentPath, 'generated.json')
    const recordData = await readFile(recordPath, 'utf-8')

    const record = JSON.parse(recordData)
    return documentGeneratedSchema.parse(record)
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
