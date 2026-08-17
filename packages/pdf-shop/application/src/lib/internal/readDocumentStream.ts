import { type ReadStream, createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { type Logger } from 'pino'

import { ApplicationError } from '../ApplicationError'

export class GeneratedDocumentNotFound extends ApplicationError {
  readonly tag = 'GeneratedDocumentNotFound'
  constructor(cause: unknown) {
    super('Generated document file could not be found', cause)
  }
}

export class GeneratedDocumentEmpty extends ApplicationError {
  readonly tag = 'GeneratedDocumentEmpty'
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
      throw new GeneratedDocumentNotFound(err)
    }
  }

  return async function (input: {
    path: string
  }): Promise<{ stream: ReadStream; size: number }> {
    const { size } = await statFile(input.path)

    if (!size) {
      throw new GeneratedDocumentEmpty(new Error('File is empty'))
    }

    return { stream: createReadStream(input.path), size }
  }
}
