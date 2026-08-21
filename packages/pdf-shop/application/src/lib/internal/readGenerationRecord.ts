import { readFile } from 'node:fs/promises'
import { type Logger } from 'pino'

import { ApplicationError } from '../ApplicationError'

import {
  type GenerationRecord,
  generationRecordSchema,
} from './data/GenerationRecord'
import { buildRecordPath } from './data/recordPath'

/** The generation record (`generated.json`) could not be found. */
export class GeneratedDocumentRecordNotFound extends ApplicationError {
  readonly tag = 'GeneratedDocumentRecordNotFound'
  constructor(cause: unknown) {
    super('Generated document record file could not be found', cause)
  }
}

/** The generation record file is not valid JSON or fails schema validation. */
export class GeneratedDocumentRecordInvalid extends ApplicationError {
  readonly tag = 'GeneratedDocumentRecordInvalid'
  constructor(cause: unknown) {
    super('Generated document record file is invalid', cause)
  }
}

/**
 * Reads and validates a document's generation record (`generated.json`).
 *
 * @param env.dataRoot - Root directory where per-document records are stored.
 * @param env.logger - Logger; a child logger is created once per instantiation.
 * @returns An async function that takes `{documentId}` and resolves to the
 *   parsed {@link GenerationRecord}.
 * @throws {GeneratedDocumentRecordNotFound} If the record file could not be found.
 * @throws {GeneratedDocumentRecordInvalid} If the file is not valid JSON or fails schema validation.
 *
 * @example
 * const record = await readGenerationRecord({ dataRoot, logger })({
 *   documentId: '11111111-1111-4111-8111-111111111111',
 * })
 * // record.contentType === 'application/pdf'
 */
export function readGenerationRecord(env: {
  dataRoot: string
  logger: Logger
}) {
  const logger = env.logger.child({
    method: 'readGenerationRecord',
  })

  async function readRecord(documentId: string) {
    try {
      const recordPath = buildRecordPath(env.dataRoot, 'generated', documentId)
      logger.trace(
        { documentId, path: recordPath },
        'Reading generated document file',
      )
      return await readFile(recordPath, 'utf-8')
    } catch (err) {
      logger.debug(
        { documentId, path: env.dataRoot },
        'Generated document record file could not be found',
      )
      throw new GeneratedDocumentRecordNotFound(err)
    }
  }

  function parseRecord(raw: string): GenerationRecord {
    try {
      const record = JSON.parse(raw)
      return generationRecordSchema.parse(record)
    } catch (err) {
      logger.debug('Generated document record file is invalid')
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
