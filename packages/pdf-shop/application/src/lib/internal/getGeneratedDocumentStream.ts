import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'

import { type Logger } from 'pino'

import { type GetGeneratedDocumentStream } from '@org/pdf-shop-contracts'

import { FileIOFailed } from './errors'

export function getGeneratedDocumentStream(env: { logger: Logger }) {
  return async function (input: GetGeneratedDocumentStream) {
    const logger = env.logger.child({
      method: 'getGeneratedDocumentStream',
      path: input.path,
    })

    try {
      logger.trace({}, 'Reading generated document file stats')
      const { size } = await stat(input.path)
      if (!size) {
        throw new Error('File is empty')
      }
      return { stream: createReadStream(input.path), size }
    } catch (err) {
      throw new FileIOFailed('Failed to read generated document stream', err)
    }
  }
}
