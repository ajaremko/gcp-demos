import path from 'node:path'
import { readFile } from 'node:fs/promises'

import { type Logger } from 'pino'

import {
  type GetDocumentSpec,
  encodeDocumentPath,
  documentCreatedSchema,
} from '@org/pdf-shop-contracts'

import { FileIOFailed } from './errors'

export function getDocumentCreated(env: { dataRoot: string; logger: Logger }) {
  return async function (input: GetDocumentSpec) {
    const logger = env.logger.child({
      method: 'getDocumentCreated',
      documentId: input.documentId,
    })

    try {
      const documentPath = encodeDocumentPath({
        documentId: input.documentId,
        version: 1,
      })

      logger.trace({}, 'Reading document spec file')
      const recordPath = path.join(env.dataRoot, documentPath, 'created.json')
      const recordData = await readFile(recordPath, 'utf-8')

      const record = JSON.parse(recordData)
      return documentCreatedSchema.parse(record)
    } catch (err) {
      throw new FileIOFailed('Failed to read document spec file', err)
    }
  }
}
