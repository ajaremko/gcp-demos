import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { type Logger } from 'pino'

import { type DocumentCreated, documentCreatedSchema } from './records'
import { encodeDocumentPath } from './documentPath'
import { ApplicationError } from '../ApplicationError'

type GetDocumentSpec = {
  documentId: string
}

export class DocumentRecordNotFound extends ApplicationError {
  readonly tag = 'DocumentRecordNotFound'
  constructor(cause: unknown) {
    super('Document record file could not be found', cause)
  }
}

export class DocumentRecordInvalid extends ApplicationError {
  readonly tag = 'DocumentRecordInvalid'
  constructor(cause: unknown) {
    super('Document record file is invalid', cause)
  }
}

export function getDocumentCreated(env: { dataRoot: string; logger: Logger }) {
  async function readDocumentRecordFile(documentId: string) {
    try {
      const documentPath = encodeDocumentPath({
        documentId,
        version: 1,
      })
      const recordPath = path.join(env.dataRoot, documentPath, 'created.json')
      return await readFile(recordPath, 'utf-8')
    } catch (err) {
      throw new DocumentRecordNotFound(err)
    }
  }

  function parseDocumentRecord(raw: string): DocumentCreated {
    try {
      const record = JSON.parse(raw)
      return documentCreatedSchema.parse(record)
    } catch (err) {
      throw new DocumentRecordInvalid(err)
    }
  }

  return async function (input: GetDocumentSpec): Promise<DocumentCreated> {
    const logger = env.logger.child({
      method: 'getDocumentCreated',
      documentId: input.documentId,
    })

    logger.trace({}, 'Reading document spec file')
    const raw = await readDocumentRecordFile(input.documentId)

    return parseDocumentRecord(raw)
  }
}
