import { mkdir, readFile, writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { handleGenerateDocument } from '../lib/handleGenerateDocument'
import { DocumentRecordNotFound } from '../lib/internal/getDocumentCreated'
import { GeneratedDocumentFileWriteFailed } from '../lib/internal/generateDocument'
import { createTempDataRoot, createTestLogger } from './testEnv'

describe('handleGenerateDocument', () => {
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

  it('reads the document record and generates the document content and record', async () => {
    await mkdir(`${dataRoot}/11111111-1111-4111-8111-111111111111`, {
      recursive: true,
    })
    await writeFile(
      `${dataRoot}/11111111-1111-4111-8111-111111111111/created.json`,
      '{' +
        '"id":"11111111-1111-4111-8111-111111111111",' +
        '"createdAt":"2024-01-01T00:00:00.000Z",' +
        '"spec":{"colorScheme":"dark","title":"Test Contract","body":"Body text"},' +
        '"payment":{"paymentIntentId":"pi_1","amount":999,"currency":"usd"}' +
        '}',
      'utf-8',
    )

    const record = await handleGenerateDocument({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })

    expect(record).toEqual({
      documentId: '11111111-1111-4111-8111-111111111111',
      path: '11111111-1111-4111-8111-111111111111',
      filename: '11111111-1111-4111-8111-111111111111.txt',
      contentType: 'text/plain',
      timestamp: '2024-01-01T00:00:00.000Z',
    })

    const generatedText = await readFile(
      `${dataRoot}/11111111-1111-4111-8111-111111111111/generated.txt`,
      'utf-8',
    )
    expect(generatedText).toBe(
      'Generated document for spec 11111111-1111-4111-8111-111111111111\n\n{\n  "colorScheme": "dark",\n  "title": "Test Contract",\n  "body": "Body text"\n}',
    )

    const generatedRecord = await readFile(
      `${dataRoot}/11111111-1111-4111-8111-111111111111/generated.json`,
      'utf-8',
    )
    expect(generatedRecord).toBe(
      '{' +
        '"documentId":"11111111-1111-4111-8111-111111111111",' +
        '"path":"11111111-1111-4111-8111-111111111111",' +
        '"filename":"11111111-1111-4111-8111-111111111111.txt",' +
        '"contentType":"text/plain",' +
        '"timestamp":"2024-01-01T00:00:00.000Z"' +
        '}',
    )
  })

  it('reads the document record and generates the document content and record by path', async () => {
    await mkdir(`${dataRoot}/11111111-1111-4111-8111-111111111111`, {
      recursive: true,
    })
    await writeFile(
      `${dataRoot}/11111111-1111-4111-8111-111111111111/created.json`,
      '{' +
        '"id":"11111111-1111-4111-8111-111111111111",' +
        '"createdAt":"2024-01-01T00:00:00.000Z",' +
        '"spec":{"colorScheme":"dark","title":"Test Contract","body":"Body text"},' +
        '"payment":{"paymentIntentId":"pi_1","amount":999,"currency":"usd"}' +
        '}',
      'utf-8',
    )

    const record = await handleGenerateDocument({ dataRoot, logger })({
      path: '11111111-1111-4111-8111-111111111111/created.json',
    })

    expect(record).toEqual({
      documentId: '11111111-1111-4111-8111-111111111111',
      path: '11111111-1111-4111-8111-111111111111',
      filename: '11111111-1111-4111-8111-111111111111.txt',
      contentType: 'text/plain',
      timestamp: '2024-01-01T00:00:00.000Z',
    })

    const generatedText = await readFile(
      `${dataRoot}/11111111-1111-4111-8111-111111111111/generated.txt`,
      'utf-8',
    )
    expect(generatedText).toBe(
      'Generated document for spec 11111111-1111-4111-8111-111111111111\n\n{\n  "colorScheme": "dark",\n  "title": "Test Contract",\n  "body": "Body text"\n}',
    )

    const generatedRecord = await readFile(
      `${dataRoot}/11111111-1111-4111-8111-111111111111/generated.json`,
      'utf-8',
    )
    expect(generatedRecord).toBe(
      '{' +
        '"documentId":"11111111-1111-4111-8111-111111111111",' +
        '"path":"11111111-1111-4111-8111-111111111111",' +
        '"filename":"11111111-1111-4111-8111-111111111111.txt",' +
        '"contentType":"text/plain",' +
        '"timestamp":"2024-01-01T00:00:00.000Z"' +
        '}',
    )
  })

  it('propagates DocumentRecordNotFound from getDocumentCreated', async () => {
    const result = handleGenerateDocument({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })

    await expect(result).rejects.toBeInstanceOf(DocumentRecordNotFound)
  })

  it('propagates GeneratedDocumentFileWriteFailed from generateDocument', async () => {
    await mkdir(`${dataRoot}/11111111-1111-4111-8111-111111111111`, {
      recursive: true,
    })
    await writeFile(
      `${dataRoot}/11111111-1111-4111-8111-111111111111/created.json`,
      '{' +
        '"id":"11111111-1111-4111-8111-111111111111",' +
        '"createdAt":"2024-01-01T00:00:00.000Z",' +
        '"spec":{"colorScheme":"dark","title":"Test Contract","body":"Body text"},' +
        '"payment":{"paymentIntentId":"pi_1","amount":999,"currency":"usd"}' +
        '}',
      'utf-8',
    )
    // Pre-create generated.txt as a directory instead of a file so writeFile
    // fails with EISDIR — deterministic regardless of user/root.
    await mkdir(
      `${dataRoot}/11111111-1111-4111-8111-111111111111/generated.txt`,
      { recursive: true },
    )

    const result = handleGenerateDocument({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })

    await expect(result).rejects.toBeInstanceOf(GeneratedDocumentFileWriteFailed)
  })
})
