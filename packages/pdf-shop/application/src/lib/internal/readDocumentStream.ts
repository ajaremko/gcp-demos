import { type ReadStream, createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { type Logger } from 'pino'

import { ApplicationError } from '../ApplicationError'

type GetGeneratedDocumentStream = {
  path: string
}

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

export function readDocumentStream(env: { logger: Logger }) {
  const logger = env.logger.child({
    method: 'readDocumentStream',
  })

  async function statFile(path: string) {
    try {
      logger.trace({ path }, 'Reading generated document file stats')
      return await stat(path)
    } catch (err) {
      throw new GeneratedDocumentStreamNotFound(err)
    }
  }

  return async function (
    input: GetGeneratedDocumentStream,
  ): Promise<{ stream: ReadStream; size: number }> {
    const { size } = await statFile(input.path)

    if (!size) {
      throw new GeneratedDocumentStreamEmpty(new Error('File is empty'))
    }

    return { stream: createReadStream(input.path), size }
  }
}
