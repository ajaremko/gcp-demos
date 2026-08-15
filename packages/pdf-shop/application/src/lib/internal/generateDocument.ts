import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  type DocumentGenerated,
  type GenerateDocument,
  encodeDocumentPath,
} from '@org/pdf-shop-contracts'

import { FileIOFailed } from './errors'

export function generateDocument(env: { dataRoot: string }) {
  return async function (input: GenerateDocument) {
    try {
      // Prepare output directory
      const documentPath = encodeDocumentPath({
        documentId: input.documentId,
        version: 1,
      })
      const outputDir = path.join(env.dataRoot, documentPath)
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
}
