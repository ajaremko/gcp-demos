import { writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import {
  getGeneratedDocumentStream,
  GeneratedDocumentStreamNotFound,
  GeneratedDocumentStreamEmpty,
} from './getGeneratedDocumentStream'
import {
  createTempDataRoot,
  createTestLogger,
} from '../../test-support/testEnv'

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
    await writeFile(`${dataRoot}/document.txt`, 'hello world', 'utf-8')

    const { stream, size } = await getGeneratedDocumentStream({ logger })({
      path: `${dataRoot}/document.txt`,
    })

    expect(size).toBe(11)
    // Collect the streamed data into a single string for assertion
    const result = new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
      stream.on('error', reject)
    })
    await expect(result).resolves.toBe('hello world')
  })

  it('throws GeneratedDocumentStreamNotFound when the file does not exist', async () => {
    const result = getGeneratedDocumentStream({ logger })({
      path: `${dataRoot}/missing.txt`,
    })
    await expect(result).rejects.toBeInstanceOf(GeneratedDocumentStreamNotFound)
  })

  it('throws GeneratedDocumentStreamEmpty when the file is empty', async () => {
    await writeFile(`${dataRoot}/empty.txt`, '', 'utf-8')

    const result = getGeneratedDocumentStream({ logger })({
      path: `${dataRoot}/empty.txt`,
    })
    await expect(result).rejects.toBeInstanceOf(GeneratedDocumentStreamEmpty)
  })
})
