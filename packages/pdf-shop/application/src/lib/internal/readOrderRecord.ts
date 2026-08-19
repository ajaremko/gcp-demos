import { readFile } from 'node:fs/promises'
import { type Logger } from 'pino'

import { ApplicationError } from '../ApplicationError'

import { type OrderRecord, orderRecordSchema } from './data/OrderRecord'
import { buildRecordPath } from './recordPath'

/** The order record (`created.json`) could not be found. */
export class DocumentOrderNotFound extends ApplicationError {
  readonly tag = 'DocumentOrderNotFound'
  constructor(cause: unknown) {
    super('Document record file could not be found', cause)
  }
}

/** The order record file is not valid JSON or fails schema validation. */
export class DocumentOrderInvalid extends ApplicationError {
  readonly tag = 'DocumentOrderInvalid'
  constructor(cause: unknown) {
    super('Document record file is invalid', cause)
  }
}

/**
 * Reads and validates an order record (`created.json`), addressed either by
 * document id or by an exact file path.
 *
 * @param env.dataRoot - Root directory where per-document records are stored.
 * @param env.logger - Logger; a child logger is created once per instantiation.
 * @returns An async function that takes either `{documentId}` (resolved to
 *   `<dataRoot>/<documentId>/created.json`) or `{path}` (an exact file path,
 *   e.g. as delivered by a storage-change notification), and resolves to the
 *   parsed {@link OrderRecord}.
 * @throws {DocumentOrderNotFound} If the record file could not be found.
 * @throws {DocumentOrderInvalid} If the file is not valid JSON or fails schema validation.
 *
 * @example
 * const record = await readOrderRecord({ dataRoot, logger })({
 *   documentId: '11111111-1111-4111-8111-111111111111',
 * })
 * // record.spec.title === 'Test Contract'
 *
 * // Equivalently, by exact path:
 * // readOrderRecord({ dataRoot, logger })({ path: `${dataRoot}/.../created.json` })
 */
export function readOrderRecord(env: { dataRoot: string; logger: Logger }) {
  const logger = env.logger.child({
    method: 'readOrderRecord',
  })

  async function readRecordFile(
    input: { documentId: string } | { path: string },
  ) {
    try {
      const recordPath =
        'path' in input
          ? input.path
          : buildRecordPath(env.dataRoot, 'created', input.documentId)
      logger.trace({ path: recordPath }, 'Reading document spec file')
      return await readFile(recordPath, 'utf-8')
    } catch (err) {
      logger.debug(input, 'Document record file could not be found')
      throw new DocumentOrderNotFound(err)
    }
  }

  function parseRecord(raw: string): OrderRecord {
    try {
      const record = JSON.parse(raw)
      return orderRecordSchema.parse(record)
    } catch (err) {
      logger.debug('Document record file is invalid')
      throw new DocumentOrderInvalid(err)
    }
  }

  return async function (
    input: { documentId: string } | { path: string },
  ): Promise<OrderRecord> {
    const raw = await readRecordFile(input)
    return parseRecord(raw)
  }
}
