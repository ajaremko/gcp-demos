import { mkdir, writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { getGeneratedDocument } from './getGeneratedDocument'
import { FileIOFailed } from './errors'
import { createTempDataRoot, createTestLogger } from '../../test-support/testEnv'

const documentId = '11111111-1111-1111-1111-111111111111'

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
    await mkdir(`${dataRoot}/v1/documents/${documentId}`, { recursive: true })
    await writeFile(
      `${dataRoot}/v1/documents/${documentId}/generated.json`,
      `{"documentId":"${documentId}","path":"v1/documents/${documentId}","filename":"${documentId}.txt","contentType":"text/plain","timestamp":"2024-01-01T00:00:00.000Z"}`,
      'utf-8',
    )

    const result = await getGeneratedDocument({ dataRoot, logger })({
      documentId,
    })

    expect(result).toEqual({
      documentId,
      path: `v1/documents/${documentId}`,
      filename: `${documentId}.txt`,
      contentType: 'text/plain',
      timestamp: '2024-01-01T00:00:00.000Z',
    })
  })

  it('throws FileIOFailed when the file does not exist', async () => {
    await expect(
      getGeneratedDocument({ dataRoot, logger })({ documentId }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })

  it('throws FileIOFailed when the file contains invalid JSON', async () => {
    await mkdir(`${dataRoot}/v1/documents/${documentId}`, { recursive: true })
    await writeFile(
      `${dataRoot}/v1/documents/${documentId}/generated.json`,
      'not json',
      'utf-8',
    )

    await expect(
      getGeneratedDocument({ dataRoot, logger })({ documentId }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })

  it('throws FileIOFailed when the file content fails schema validation', async () => {
    await mkdir(`${dataRoot}/v1/documents/${documentId}`, { recursive: true })
    await writeFile(
      `${dataRoot}/v1/documents/${documentId}/generated.json`,
      '{"foo":"bar"}',
      'utf-8',
    )

    await expect(
      getGeneratedDocument({ dataRoot, logger })({ documentId }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })
})
