import { type ReadStream, createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { type Logger } from 'pino'

import { type GetGeneratedDocumentStream } from '@org/pdf-shop-contracts'

import { ApplicationError } from '../ApplicationError'

export class GeneratedDocumentStreamNotFound extends ApplicationError {
  readonly tag = 'GeneratedDocumentStreamNotFound'
  constructor(cause: unknown) {
    super('Generated document file could not be found', cause)
  }
}

export class GeneratedDocumentStreamEmpty extends ApplicationError {
  readonly tag = 'GeneratedDocumentStreamEmpty'
  constructor(cause: unknown) {
    super('Generated document file is empty', cause)
  }
}

export function getGeneratedDocumentStream(env: { logger: Logger }) {
  async function statGeneratedDocumentFile(path: string) {
    try {
      return await stat(path)
    } catch (err) {
      throw new GeneratedDocumentStreamNotFound(err)
    }
  }

  return async function (
    input: GetGeneratedDocumentStream,
  ): Promise<{ stream: ReadStream; size: number }> {
    const logger = env.logger.child({
      method: 'getGeneratedDocumentStream',
      path: input.path,
    })

    logger.trace({}, 'Reading generated document file stats')
    const { size } = await statGeneratedDocumentFile(input.path)

    if (!size) {
      throw new GeneratedDocumentStreamEmpty(new Error('File is empty'))
    }

    return { stream: createReadStream(input.path), size }
  }
}
