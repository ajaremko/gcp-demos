import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { type Logger } from 'pino'

import { type DocumentOrder, documentOrderSchema } from './records'
import { ApplicationError } from '../ApplicationError'

type GetDocumentOrder = { documentId: string } | { path: string }

export class DocumentOrderNotFound extends ApplicationError {
  readonly tag = 'DocumentOrderNotFound'
  constructor(cause: unknown) {
    super('Document record file could not be found', cause)
  }
}

export class DocumentOrderInvalid extends ApplicationError {
  readonly tag = 'DocumentOrderInvalid'
  constructor(cause: unknown) {
    super('Document record file is invalid', cause)
  }
}

export function getDocumentOrder(env: { dataRoot: string; logger: Logger }) {
  const logger = env.logger.child({
    method: 'getDocumentOrder',
  })

  async function readDocumentRecordFile(input: GetDocumentOrder) {
    try {
      const recordPath =
        'path' in input
          ? input.path
          : path.join(env.dataRoot, input.documentId, 'created.json')
      logger.trace({ path: recordPath }, 'Reading document spec file')
      return await readFile(recordPath, 'utf-8')
    } catch (err) {
      throw new DocumentOrderNotFound(err)
    }
  }

  function parseDocumentRecord(raw: string): DocumentOrder {
    try {
      const record = JSON.parse(raw)
      return documentOrderSchema.parse(record)
    } catch (err) {
      throw new DocumentOrderInvalid(err)
    }
  }

  return async function (input: GetDocumentOrder): Promise<DocumentOrder> {
    const raw = await readDocumentRecordFile(input)
    return parseDocumentRecord(raw)
  }
}
