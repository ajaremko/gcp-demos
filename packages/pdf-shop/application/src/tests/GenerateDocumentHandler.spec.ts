import { mkdir, readFile, writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { GenerateDocumentHandler } from '../lib/GenerateDocumentHandler'
import { DocumentOrderNotFound } from '../lib/internal/readOrderRecord'
import { GeneratedDocumentWriteFailed } from '../lib/internal/generateDocument'
import {
  createTempDataRoot,
  createTestLogger,
  createFakePdfGenerator,
} from './testEnv'

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

    const pdfGenerator = createFakePdfGenerator()
    const record = await GenerateDocumentHandler({
      dataRoot,
      logger,
      pdfGenerator,
    })({
      path: `${dataRoot}/created/11111111-1111-4111-8111-111111111111.json`,
    })

    expect(record).toEqual({
      documentId: '11111111-1111-4111-8111-111111111111',
      path: `${dataRoot}/generated/11111111-1111-4111-8111-111111111111.pdf`,
      filename: '11111111-1111-4111-8111-111111111111.pdf',
      contentType: 'application/pdf',
      timestamp: '2024-01-01T00:00:00.000Z',
    })

    const generatedBytes = await readFile(
      `${dataRoot}/generated/11111111-1111-4111-8111-111111111111.pdf`,
    )
    expect(generatedBytes).toEqual(
      Buffer.from(new TextEncoder().encode('fake-pdf-content')),
    )

    const generatedRecord = await readFile(
      `${dataRoot}/generated/11111111-1111-4111-8111-111111111111.json`,
      'utf-8',
    )
    expect(generatedRecord).toBe(
      '{' +
        '"documentId":"11111111-1111-4111-8111-111111111111",' +
        `"path":"${dataRoot}/generated/11111111-1111-4111-8111-111111111111.pdf",` +
        '"filename":"11111111-1111-4111-8111-111111111111.pdf",' +
        '"contentType":"application/pdf",' +
        '"timestamp":"2024-01-01T00:00:00.000Z"' +
        '}',
    )
  })

  it('propagates DocumentOrderNotFound from readOrderRecord', async () => {
    const result = GenerateDocumentHandler({
      dataRoot,
      logger,
      pdfGenerator: createFakePdfGenerator(),
    })({
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
    // Pre-create the generated .pdf output as a directory instead of a
    // file so writeFile fails with EISDIR - deterministic regardless of
    // user/root.
    await mkdir(
      `${dataRoot}/generated/11111111-1111-4111-8111-111111111111.pdf`,
      { recursive: true },
    )

    const result = GenerateDocumentHandler({
      dataRoot,
      logger,
      pdfGenerator: createFakePdfGenerator(),
    })({
      path: `${dataRoot}/created/11111111-1111-4111-8111-111111111111.json`,
    })

    await expect(result).rejects.toBeInstanceOf(GeneratedDocumentWriteFailed)
  })
})
