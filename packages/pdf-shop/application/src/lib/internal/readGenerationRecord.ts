import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { type Logger } from 'pino'

import { ApplicationError } from '../ApplicationError'

import {
  type GenerationRecord,
  generationRecordSchema,
} from './data/GenerationRecord'

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

export function readGenerationRecord(env: {
  dataRoot: string
  logger: Logger
}) {
  const logger = env.logger.child({
    method: 'readGenerationRecord',
  })

  async function readRecord(documentId: string) {
    try {
      const recordPath = path.join(env.dataRoot, documentId, 'generated.json')
      logger.trace(
        { documentId, path: recordPath },
        'Reading generated document file',
      )
      return await readFile(recordPath, 'utf-8')
    } catch (err) {
      throw new GeneratedDocumentRecordNotFound(err)
    }
  }

  function parseRecord(raw: string): GenerationRecord {
    try {
      const record = JSON.parse(raw)
      return generationRecordSchema.parse(record)
    } catch (err) {
      throw new GeneratedDocumentRecordInvalid(err)
    }
  }

  return async function (input: {
    documentId: string
  }): Promise<GenerationRecord> {
    const raw = await readRecord(input.documentId)
    return parseRecord(raw)
  }
}
