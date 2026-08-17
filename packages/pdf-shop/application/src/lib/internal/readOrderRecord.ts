import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { type Logger } from 'pino'

import { ApplicationError } from '../ApplicationError'

import { type OrderRecord, orderRecordSchema } from './data/OrderRecord'

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
          : path.join(env.dataRoot, input.documentId, 'created.json')
      logger.trace({ path: recordPath }, 'Reading document spec file')
      return await readFile(recordPath, 'utf-8')
    } catch (err) {
      throw new DocumentOrderNotFound(err)
    }
  }

  function parseRecord(raw: string): OrderRecord {
    try {
      const record = JSON.parse(raw)
      return orderRecordSchema.parse(record)
    } catch (err) {
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
