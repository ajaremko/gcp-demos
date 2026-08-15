import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { type Logger } from 'pino'

import {
  type GetGeneratedDocument,
  encodeDocumentPath,
  documentGeneratedSchema,
} from '@org/pdf-shop-contracts'
import { FileIOFailed } from './errors'

export function getGeneratedDocument(env: {
  dataRoot: string
  logger: Logger
}) {
  return async function (input: GetGeneratedDocument) {
    const logger = env.logger.child({
      method: 'getGeneratedDocument',
      documentId: input.documentId,
    })

    try {
      const documentPath = encodeDocumentPath({
        documentId: input.documentId,
        version: 1,
      })

      logger.trace({}, 'Reading generated document file')
      const recordPath = path.join(env.dataRoot, documentPath, 'generated.json')
      const recordData = await readFile(recordPath, 'utf-8')

      const record = JSON.parse(recordData)
      return documentGeneratedSchema.parse(record)
    } catch (err) {
      throw new FileIOFailed('Failed to read generated document file', err)
    }
  }
}
