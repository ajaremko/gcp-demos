import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { getGeneratedDocumentStream } from './getGeneratedDocumentStream'
import { FileIOFailed } from './errors'
import { createTempDataRoot, createTestLogger } from '../../test-support/testEnv'

function readStreamToString(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    stream.on('error', reject)
  })
}

describe('getGeneratedDocumentStream', () => {
  let dataRoot: string
  let cleanup: () => Promise<void>
  const logger = createTestLogger()

  beforeEach(async () => {
    ;({ dataRoot, cleanup } = await createTempDataRoot())
  })

  afterEach(async () => {
    await cleanup()
  })

  it('streams an existing non-empty file and reports its size', async () => {
    const filePath = path.join(dataRoot, 'document.txt')
    await writeFile(filePath, 'hello world', 'utf-8')

    const { stream, size } = await getGeneratedDocumentStream({ logger })({
      path: filePath,
    })

    expect(size).toBe(Buffer.byteLength('hello world'));
    await expect(readStreamToString(stream)).resolves.toBe('hello world')
  })

  it('throws FileIOFailed when the file does not exist', async () => {
    await expect(
      getGeneratedDocumentStream({ logger })({
        path: path.join(dataRoot, 'missing.txt'),
      }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })

  it('throws FileIOFailed when the file is empty', async () => {
    const filePath = path.join(dataRoot, 'empty.txt')
    await writeFile(filePath, '', 'utf-8')

    await expect(
      getGeneratedDocumentStream({ logger })({ path: filePath }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })
})
