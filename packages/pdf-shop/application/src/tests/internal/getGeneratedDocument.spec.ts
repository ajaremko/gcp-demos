import { mkdir, writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import {
  getGeneratedDocument,
  GeneratedDocumentRecordNotFound,
  GeneratedDocumentRecordInvalid,
} from '../../lib/internal/getGeneratedDocument'
import { createTempDataRoot, createTestLogger } from '../testEnv'

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
    await mkdir(`${dataRoot}/11111111-1111-4111-8111-111111111111`, {
      recursive: true,
    })
    await writeFile(
      `${dataRoot}/11111111-1111-4111-8111-111111111111/generated.json`,
      '{' +
        '"documentId":"11111111-1111-4111-8111-111111111111",' +
        '"path":"11111111-1111-4111-8111-111111111111",' +
        '"filename":"11111111-1111-4111-8111-111111111111.txt",' +
        '"contentType":"text/plain",' +
        '"timestamp":"2024-01-01T00:00:00.000Z"' +
        '}',
      'utf-8',
    )

    const result = await getGeneratedDocument({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })

    expect(result).toEqual({
      documentId: '11111111-1111-4111-8111-111111111111',
      path: '11111111-1111-4111-8111-111111111111',
      filename: '11111111-1111-4111-8111-111111111111.txt',
      contentType: 'text/plain',
      timestamp: '2024-01-01T00:00:00.000Z',
    })
  })

  it('throws GeneratedDocumentRecordNotFound when the file does not exist', async () => {
    const result = getGeneratedDocument({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })
    await expect(result).rejects.toBeInstanceOf(GeneratedDocumentRecordNotFound)
  })

  it('throws GeneratedDocumentRecordInvalid when the file contains invalid JSON', async () => {
    await mkdir(`${dataRoot}/11111111-1111-4111-8111-111111111111`, {
      recursive: true,
    })
    await writeFile(
      `${dataRoot}/11111111-1111-4111-8111-111111111111/generated.json`,
      'not json',
      'utf-8',
    )

    const result = getGeneratedDocument({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })
    await expect(result).rejects.toBeInstanceOf(GeneratedDocumentRecordInvalid)
  })

  it('throws GeneratedDocumentRecordInvalid when the file content fails schema validation', async () => {
    await mkdir(`${dataRoot}/11111111-1111-4111-8111-111111111111`, {
      recursive: true,
    })
    await writeFile(
      `${dataRoot}/11111111-1111-4111-8111-111111111111/generated.json`,
      '{"foo":"bar"}',
      'utf-8',
    )

    const result = getGeneratedDocument({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })
    await expect(result).rejects.toBeInstanceOf(GeneratedDocumentRecordInvalid)
  })
})
