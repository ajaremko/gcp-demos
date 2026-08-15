import path from 'node:path'
import { readFile } from 'node:fs/promises'

import {
  type GetDocumentSpec,
  encodeDocumentPath,
  documentCreatedSchema,
} from '@org/pdf-shop-contracts'

import { FileIOFailed } from './errors'

export function getDocumentCreated(env: { dataRoot: string }) {
  return async function (input: GetDocumentSpec) {
    try {
      const documentPath = encodeDocumentPath({
        documentId: input.documentId,
        version: 1,
      })

      const recordPath = path.join(env.dataRoot, documentPath, 'created.json')
      const recordData = await readFile(recordPath, 'utf-8')

      const record = JSON.parse(recordData)
      return documentCreatedSchema.parse(record)
    } catch (err) {
      throw new FileIOFailed('Failed to read document spec file', err)
    }
  }
}
