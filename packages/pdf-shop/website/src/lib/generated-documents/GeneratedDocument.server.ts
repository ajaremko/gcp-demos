import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'

export async function getGeneratedDocumentStream(input: { path: string }) {
  const { size } = await stat(input.path)
  if (!size) {
    throw new Error('File is empty')
  }
  return { stream: createReadStream(input.path), size }
}
