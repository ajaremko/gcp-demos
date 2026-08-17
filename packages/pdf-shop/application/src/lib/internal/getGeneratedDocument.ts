import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { type Logger } from 'pino'

import { type DocumentGenerated, documentGeneratedSchema } from './records'
import { ApplicationError } from '../ApplicationError'

type GetGeneratedDocument = {
  documentId: string
}

export class GeneratedDocumentRecordNotFound extends ApplicationError {
  readonly tag = 'GeneratedDocumentRecordNotFound'
  constructor(cause: unknown) {
    super('Generated document record file could not be found', cause)
  }
}

export class GeneratedDocumentRecordInvalid extends ApplicationError {
  readonly tag = 'GeneratedDocumentRecordInvalid'
  constructor(cause: unknown) {
    super('Generated document record file is invalid', cause)
  }
}

export function getGeneratedDocument(env: {
  dataRoot: string
  logger: Logger
}) {
  async function readGeneratedDocumentFile(documentId: string) {
    try {
      const recordPath = path.join(env.dataRoot, documentId, 'generated.json')
      return await readFile(recordPath, 'utf-8')
    } catch (err) {
      throw new GeneratedDocumentRecordNotFound(err)
    }
  }

  function parseGeneratedDocumentRecord(raw: string): DocumentGenerated {
    try {
      const record = JSON.parse(raw)
      return documentGeneratedSchema.parse(record)
    } catch (err) {
      throw new GeneratedDocumentRecordInvalid(err)
    }
  }

  return async function (
    input: GetGeneratedDocument,
  ): Promise<DocumentGenerated> {
    const logger = env.logger.child({
      method: 'getGeneratedDocument',
      documentId: input.documentId,
    })

    logger.trace({}, 'Reading generated document file')
    const raw = await readGeneratedDocumentFile(input.documentId)

    return parseGeneratedDocumentRecord(raw)
  }
}
