import { writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import {
  readDocumentStream,
  GeneratedDocumentNotFound,
  GeneratedDocumentEmpty,
} from '../../lib/internal/readDocumentStream'
import { createTempDataRoot, createTestLogger } from '../testEnv'

describe('readDocumentStream', () => {
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

    const { stream, size } = await readDocumentStream({ logger })({
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

  it('throws GeneratedDocumentNotFound when the file does not exist', async () => {
    const result = readDocumentStream({ logger })({
      path: `${dataRoot}/missing.txt`,
    })
    await expect(result).rejects.toBeInstanceOf(GeneratedDocumentNotFound)
  })

  it('throws GeneratedDocumentEmpty when the file is empty', async () => {
    await writeFile(`${dataRoot}/empty.txt`, '', 'utf-8')

    const result = readDocumentStream({ logger })({
      path: `${dataRoot}/empty.txt`,
    })
    await expect(result).rejects.toBeInstanceOf(GeneratedDocumentEmpty)
  })
})
