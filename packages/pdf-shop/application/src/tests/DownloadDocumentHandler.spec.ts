import { mkdir, writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { DownloadDocumentHandler } from '../lib/DownloadDocumentHandler'
import { GeneratedDocumentRecordNotFound } from '../lib/internal/readGenerationRecord'
import { PaymentConfirmationNotFound } from '../lib/internal/readPaymentRecord'
import { GeneratedDocumentNotFound } from '../lib/internal/readDocumentStream'
import { createTempDataRoot, createTestLogger } from './testEnv'

function readStreamToString(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    stream.on('error', reject)
  })
}

describe('DownloadDocumentHandler', () => {
  let dataRoot: string
  let cleanup: () => Promise<void>
  const logger = createTestLogger()

  beforeEach(async () => {
    ;({ dataRoot, cleanup } = await createTempDataRoot())
  })

  afterEach(async () => {
    await cleanup()
  })

  it('reads the generated document, confirms payment, and streams the file', async () => {
    await mkdir(`${dataRoot}/generated`, { recursive: true })
    await mkdir(`${dataRoot}/paid`, { recursive: true })
    // generated.json's "path" is a real, directly-statable absolute path —
    // readDocumentStream stats/reads it as-is, with no dataRoot
    // joining, so the fixture must point straight at a real file.
    await writeFile(`${dataRoot}/generated-output.txt`, 'hello world', 'utf-8')
    await writeFile(
      `${dataRoot}/generated/11111111-1111-4111-8111-111111111111.json`,
      `{` +
        `"documentId":"11111111-1111-4111-8111-111111111111",` +
        `"path":"${dataRoot}/generated-output.txt",` +
        `"filename":"contract.txt",` +
        `"contentType":"text/plain",` +
        `"timestamp":"2024-01-01T00:00:00.000Z"` +
        `}`,
      'utf-8',
    )
    await writeFile(
      `${dataRoot}/paid/11111111-1111-4111-8111-111111111111.json`,
      '{' +
        '"documentId":"11111111-1111-4111-8111-111111111111",' +
        '"stripePaymentIntentId":"pi_1",' +
        '"amount":999,' +
        '"currency":"usd",' +
        '"confirmedAt":"2024-01-01T00:00:00.000Z"' +
        '}',
      'utf-8',
    )

    const result = await DownloadDocumentHandler({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })

    expect(result.filename).toBe('contract.txt')
    expect(result.contentType).toBe('text/plain')
    expect(result.size).toBe(11)
    await expect(readStreamToString(result.stream)).resolves.toBe('hello world')
  })

  it('propagates GeneratedDocumentRecordNotFound from readGenerationRecord', async () => {
    const result = DownloadDocumentHandler({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })

    await expect(result).rejects.toBeInstanceOf(GeneratedDocumentRecordNotFound)
  })

  it('propagates PaymentConfirmationNotFound from getPayment', async () => {
    await mkdir(`${dataRoot}/generated`, { recursive: true })
    await writeFile(`${dataRoot}/generated-output.txt`, 'hello world', 'utf-8')
    await writeFile(
      `${dataRoot}/generated/11111111-1111-4111-8111-111111111111.json`,
      `{` +
        `"documentId":"11111111-1111-4111-8111-111111111111",` +
        `"path":"${dataRoot}/generated-output.txt",` +
        `"filename":"contract.txt",` +
        `"contentType":"text/plain",` +
        `"timestamp":"2024-01-01T00:00:00.000Z"` +
        `}`,
      'utf-8',
    )

    const result = DownloadDocumentHandler({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })

    await expect(result).rejects.toBeInstanceOf(PaymentConfirmationNotFound)
  })

  it('propagates GeneratedDocumentNotFound from readDocumentStream', async () => {
    await mkdir(`${dataRoot}/generated`, { recursive: true })
    await mkdir(`${dataRoot}/paid`, { recursive: true })
    // No file written at generated-output.txt — the record points at a
    // path that doesn't exist.
    await writeFile(
      `${dataRoot}/generated/11111111-1111-4111-8111-111111111111.json`,
      `{` +
        `"documentId":"11111111-1111-4111-8111-111111111111",` +
        `"path":"${dataRoot}/generated-output.txt",` +
        `"filename":"contract.txt",` +
        `"contentType":"text/plain",` +
        `"timestamp":"2024-01-01T00:00:00.000Z"` +
        `}`,
      'utf-8',
    )
    await writeFile(
      `${dataRoot}/paid/11111111-1111-4111-8111-111111111111.json`,
      '{' +
        '"documentId":"11111111-1111-4111-8111-111111111111",' +
        '"stripePaymentIntentId":"pi_1",' +
        '"amount":999,' +
        '"currency":"usd",' +
        '"confirmedAt":"2024-01-01T00:00:00.000Z"' +
        '}',
      'utf-8',
    )

    const result = DownloadDocumentHandler({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })

    await expect(result).rejects.toBeInstanceOf(GeneratedDocumentNotFound)
  })
})
