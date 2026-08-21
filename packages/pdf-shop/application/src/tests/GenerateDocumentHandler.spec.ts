import { mkdir, readFile, writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { GenerateDocumentHandler } from '../lib/GenerateDocumentHandler'
import { DocumentOrderNotFound } from '../lib/internal/readOrderRecord'
import { GeneratedDocumentWriteFailed } from '../lib/internal/generateDocument'
import { createTempDataRoot, createTestLogger } from './testEnv'

describe('GenerateDocumentHandler', () => {
  let dataRoot: string
  let cleanup: () => Promise<void>
  const logger = createTestLogger()

  beforeEach(async () => {
    ;({ dataRoot, cleanup } = await createTempDataRoot())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'))
  })

  afterEach(async () => {
    vi.useRealTimers()
    await cleanup()
  })

  it('reads the document record and generates the document content and record by path', async () => {
    await mkdir(`${dataRoot}/created`, {
      recursive: true,
    })
    await writeFile(
      `${dataRoot}/created/11111111-1111-4111-8111-111111111111.json`,
      '{' +
        '"id":"11111111-1111-4111-8111-111111111111",' +
        '"createdAt":"2024-01-01T00:00:00.000Z",' +
        '"spec":{"colorScheme":"dark","title":"Test Contract","body":"Body text"},' +
        '"payment":{"paymentIntentId":"pi_1","amount":999,"currency":"usd"}' +
        '}',
      'utf-8',
    )

    const record = await GenerateDocumentHandler({ dataRoot, logger })({
      path: `${dataRoot}/created/11111111-1111-4111-8111-111111111111.json`,
    })

    expect(record).toEqual({
      documentId: '11111111-1111-4111-8111-111111111111',
      path: `${dataRoot}/generated/11111111-1111-4111-8111-111111111111.txt`,
      filename: '11111111-1111-4111-8111-111111111111.txt',
      contentType: 'text/plain',
      timestamp: '2024-01-01T00:00:00.000Z',
    })

    const generatedText = await readFile(
      `${dataRoot}/generated/11111111-1111-4111-8111-111111111111.txt`,
      'utf-8',
    )
    expect(generatedText).toBe(
      'Generated document for spec 11111111-1111-4111-8111-111111111111\n\n{\n  "colorScheme": "dark",\n  "title": "Test Contract",\n  "body": "Body text"\n}',
    )

    const generatedRecord = await readFile(
      `${dataRoot}/generated/11111111-1111-4111-8111-111111111111.json`,
      'utf-8',
    )
    expect(generatedRecord).toBe(
      '{' +
        '"documentId":"11111111-1111-4111-8111-111111111111",' +
        `"path":"${dataRoot}/generated/11111111-1111-4111-8111-111111111111.txt",` +
        '"filename":"11111111-1111-4111-8111-111111111111.txt",' +
        '"contentType":"text/plain",' +
        '"timestamp":"2024-01-01T00:00:00.000Z"' +
        '}',
    )
  })

  it('propagates DocumentOrderNotFound from readOrderRecord', async () => {
    const result = GenerateDocumentHandler({ dataRoot, logger })({
      path: `${dataRoot}/created/11111111-1111-4111-8111-111111111111.json`,
    })

    await expect(result).rejects.toBeInstanceOf(DocumentOrderNotFound)
  })

  it('propagates GeneratedDocumentWriteFailed from generateDocument', async () => {
    await mkdir(`${dataRoot}/created`, {
      recursive: true,
    })
    await writeFile(
      `${dataRoot}/created/11111111-1111-4111-8111-111111111111.json`,
      '{' +
        '"id":"11111111-1111-4111-8111-111111111111",' +
        '"createdAt":"2024-01-01T00:00:00.000Z",' +
        '"spec":{"colorScheme":"dark","title":"Test Contract","body":"Body text"},' +
        '"payment":{"paymentIntentId":"pi_1","amount":999,"currency":"usd"}' +
        '}',
      'utf-8',
    )
    // Pre-create the generated .txt output as a directory instead of a
    // file so writeFile fails with EISDIR - deterministic regardless of
    // user/root.
    await mkdir(
      `${dataRoot}/generated/11111111-1111-4111-8111-111111111111.txt`,
      { recursive: true },
    )

    const result = GenerateDocumentHandler({ dataRoot, logger })({
      path: `${dataRoot}/created/11111111-1111-4111-8111-111111111111.json`,
    })

    await expect(result).rejects.toBeInstanceOf(GeneratedDocumentWriteFailed)
  })
})
