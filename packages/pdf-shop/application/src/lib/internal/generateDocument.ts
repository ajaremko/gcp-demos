import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { type Logger } from 'pino'

import {
  type DocumentGenerated,
  type GenerateDocument,
  encodeDocumentPath,
} from '@org/pdf-shop-contracts'

import { FileIOFailed } from './errors'

export function generateDocument(env: { dataRoot: string; logger: Logger }) {
  return async function (input: GenerateDocument) {
    const logger = env.logger.child({
      method: 'generateDocument',
      documentId: input.documentId,
    })

    try {
      // Prepare output directory
      logger.trace({}, 'Preparing output directory for document')
      const documentPath = encodeDocumentPath({
        documentId: input.documentId,
        version: 1,
      })
      const outputDir = path.join(env.dataRoot, documentPath)
      await mkdir(outputDir, { recursive: true })

      // Generate and write document content
      logger.trace({}, 'Writing generated document file')
      const generatedData = `Generated document for spec ${input.documentId}\n\n${JSON.stringify(input.spec, null, 2)}`
      const generatedPath = path.join(outputDir, `generated.txt`)
      await writeFile(generatedPath, generatedData, 'utf-8')

      // Write a record of the generated document
      logger.trace({}, 'Writing generated document record')
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
