import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'

import { type GetGeneratedDocumentStream } from '@org/pdf-shop-contracts'

import { FileIOFailed } from './errors'

export async function getGeneratedDocumentStream(
  input: GetGeneratedDocumentStream,
) {
  try {
    const { size } = await stat(input.path)
    if (!size) {
      throw new Error('File is empty')
    }
    return { stream: createReadStream(input.path), size }
  } catch (err) {
    throw new FileIOFailed('Failed to read generated document stream', err)
  }
}
