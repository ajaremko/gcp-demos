import { type ReadStream, createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { type Logger } from 'pino'

import { ApplicationError } from '../ApplicationError'

/** The generated document file could not be found (or stat'd). */
export class GeneratedDocumentNotFound extends ApplicationError {
  readonly tag = 'GeneratedDocumentNotFound'
  constructor(cause: unknown) {
    super('Generated document file could not be found', cause)
  }
}

/** The generated document file exists but is zero bytes. */
export class GeneratedDocumentEmpty extends ApplicationError {
  readonly tag = 'GeneratedDocumentEmpty'
  constructor(cause: unknown) {
    super('Generated document file is empty', cause)
  }
}

/**
 * Opens a readable stream over a generated document file and reports its size.
 *
 * @param env.logger - Logger; a child logger is created once per instantiation.
 * @returns An async function that takes `{path}` (an absolute file path) and
 *   resolves to `{stream, size}`, where `stream` is a Node `ReadStream` over
 *   the file and `size` is its byte length.
 * @throws {GeneratedDocumentNotFound} If the file does not exist (or cannot be stat'd).
 * @throws {GeneratedDocumentEmpty} If the file exists but is zero bytes.
 *
 * @example
 * const { stream, size } = await readDocumentStream({ logger })({
 *   path: `${dataRoot}/document.pdf`,
 * })
 * // size === 11
 * // stream.pipe(response)
 */
export function readDocumentStream(env: { logger: Logger }) {
  const logger = env.logger.child({
    method: 'readDocumentStream',
  })

  async function statFile(path: string) {
    try {
      logger.trace({ path }, 'Reading generated document file stats')
      return await stat(path)
    } catch (err) {
      logger.debug({ path }, 'Generated document file could not be found')
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
