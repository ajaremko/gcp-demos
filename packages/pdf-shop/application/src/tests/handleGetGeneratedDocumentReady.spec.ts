import { mkdir, writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ZodError } from 'zod'

import { handleGetGeneratedDocumentReady } from '../lib/handleGetGeneratedDocumentReady'
import { GeneratedDocumentRecordNotFound } from '../lib/internal/getGeneratedDocument'
import { PaymentConfirmationNotFound } from '../lib/internal/getPayment'
import { createTempDataRoot, createTestLogger } from './testEnv'

describe('handleGetGeneratedDocumentReady', () => {
  let dataRoot: string
  let cleanup: () => Promise<void>
  const logger = createTestLogger()

  beforeEach(async () => {
    ;({ dataRoot, cleanup } = await createTempDataRoot())
  })

  afterEach(async () => {
    await cleanup()
  })

  it('validates input and returns true when the document is generated and paid for', async () => {
    await mkdir(
      `${dataRoot}/v1/documents/11111111-1111-4111-8111-111111111111`,
      { recursive: true },
    )
    await writeFile(
      `${dataRoot}/v1/documents/11111111-1111-4111-8111-111111111111/generated.json`,
      '{' +
        '"documentId":"11111111-1111-4111-8111-111111111111",' +
        '"path":"v1/documents/11111111-1111-4111-8111-111111111111",' +
        '"filename":"contract.txt",' +
        '"contentType":"text/plain",' +
        '"timestamp":"2024-01-01T00:00:00.000Z"' +
        '}',
      'utf-8',
    )
    await writeFile(
      `${dataRoot}/v1/documents/11111111-1111-4111-8111-111111111111/paid.json`,
      '{' +
        '"documentId":"11111111-1111-4111-8111-111111111111",' +
        '"stripePaymentIntentId":"pi_1",' +
        '"amount":999,' +
        '"currency":"usd",' +
        '"confirmedAt":"2024-01-01T00:00:00.000Z"' +
        '}',
      'utf-8',
    )

    const result = await handleGetGeneratedDocumentReady({
      dataRoot,
      logger,
    })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })

    expect(result).toBe(true)
  })

  it('throws ZodError when the input is invalid', async () => {
    const result = handleGetGeneratedDocumentReady({ dataRoot, logger })({
      documentId: 'not-a-uuid',
    })

    await expect(result).rejects.toBeInstanceOf(ZodError)
  })

  it('propagates GeneratedDocumentRecordNotFound from getGeneratedDocument', async () => {
    const result = handleGetGeneratedDocumentReady({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })

    await expect(result).rejects.toBeInstanceOf(GeneratedDocumentRecordNotFound)
  })

  it('propagates PaymentConfirmationNotFound from getPayment', async () => {
    await mkdir(
      `${dataRoot}/v1/documents/11111111-1111-4111-8111-111111111111`,
      { recursive: true },
    )
    await writeFile(
      `${dataRoot}/v1/documents/11111111-1111-4111-8111-111111111111/generated.json`,
      '{' +
        '"documentId":"11111111-1111-4111-8111-111111111111",' +
        '"path":"v1/documents/11111111-1111-4111-8111-111111111111",' +
        '"filename":"contract.txt",' +
        '"contentType":"text/plain",' +
        '"timestamp":"2024-01-01T00:00:00.000Z"' +
        '}',
      'utf-8',
    )

    const result = handleGetGeneratedDocumentReady({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })

    await expect(result).rejects.toBeInstanceOf(PaymentConfirmationNotFound)
  })
})
