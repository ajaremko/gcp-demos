import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  encodeDocumentPath,
  type DocumentGenerated,
} from '@org/pdf-shop-contracts'

import { getGeneratedDocument } from './getGeneratedDocument'
import { FileIOFailed } from './errors'
import { createTempDataRoot, createTestLogger } from '../../test-support/testEnv'

describe('getGeneratedDocument', () => {
  let dataRoot: string
  let cleanup: () => Promise<void>
  const logger = createTestLogger()

  beforeEach(async () => {
    ;({ dataRoot, cleanup } = await createTempDataRoot())
  })

  afterEach(async () => {
    await cleanup()
  })

  it('reads and parses an existing generated document file', async () => {
    const documentId = randomUUID()
    const documentPath = encodeDocumentPath({ documentId, version: 1 })
    const dir = path.join(dataRoot, documentPath)
    const record: DocumentGenerated = {
      documentId,
      path: path.join(dir, `${documentId}.txt`),
      filename: `${documentId}.txt`,
      contentType: 'text/plain',
      timestamp: new Date().toISOString(),
    }

    await mkdir(dir, { recursive: true })
    await writeFile(
      path.join(dir, 'generated.json'),
      JSON.stringify(record),
      'utf-8',
    )

    const result = await getGeneratedDocument({ dataRoot, logger })({
      documentId,
    })

    expect(result).toEqual(record)
  })

  it('throws FileIOFailed when the file does not exist', async () => {
    await expect(
      getGeneratedDocument({ dataRoot, logger })({
        documentId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })

  it('throws FileIOFailed when the file contains invalid JSON', async () => {
    const documentId = randomUUID()
    const documentPath = encodeDocumentPath({ documentId, version: 1 })
    const dir = path.join(dataRoot, documentPath)
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, 'generated.json'), 'not json', 'utf-8')

    await expect(
      getGeneratedDocument({ dataRoot, logger })({ documentId }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })

  it('throws FileIOFailed when the file content fails schema validation', async () => {
    const documentId = randomUUID()
    const documentPath = encodeDocumentPath({ documentId, version: 1 })
    const dir = path.join(dataRoot, documentPath)
    await mkdir(dir, { recursive: true })
    await writeFile(
      path.join(dir, 'generated.json'),
      JSON.stringify({ foo: 'bar' }),
      'utf-8',
    )

    await expect(
      getGeneratedDocument({ dataRoot, logger })({ documentId }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })
})
