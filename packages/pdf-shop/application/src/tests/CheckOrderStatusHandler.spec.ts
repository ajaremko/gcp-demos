import { mkdir, writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { CheckOrderStatusHandler } from '../lib/CheckOrderStatusHandler'
import { GeneratedDocumentRecordNotFound } from '../lib/internal/readGenerationRecord'
import { PaymentConfirmationNotFound } from '../lib/internal/readPaymentRecord'
import { createTempDataRoot, createTestLogger } from './testEnv'

describe('CheckOrderStatusHandler', () => {
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
    await mkdir(`${dataRoot}/generated`, { recursive: true })
    await mkdir(`${dataRoot}/paid`, { recursive: true })
    await writeFile(
      `${dataRoot}/generated/11111111-1111-4111-8111-111111111111.json`,
      '{' +
        '"documentId":"11111111-1111-4111-8111-111111111111",' +
        '"path":"11111111-1111-4111-8111-111111111111",' +
        '"filename":"contract.txt",' +
        '"contentType":"text/plain",' +
        '"timestamp":"2024-01-01T00:00:00.000Z"' +
        '}',
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

    const result = await CheckOrderStatusHandler({
      dataRoot,
      logger,
    })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })

    expect(result).toBe(true)
  })

  it('propagates GeneratedDocumentRecordNotFound from readGenerationRecord', async () => {
    const result = CheckOrderStatusHandler({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })

    await expect(result).rejects.toBeInstanceOf(GeneratedDocumentRecordNotFound)
  })

  it('propagates PaymentConfirmationNotFound from getPayment', async () => {
    await mkdir(`${dataRoot}/generated`, { recursive: true })
    await writeFile(
      `${dataRoot}/generated/11111111-1111-4111-8111-111111111111.json`,
      '{' +
        '"documentId":"11111111-1111-4111-8111-111111111111",' +
        '"path":"11111111-1111-4111-8111-111111111111",' +
        '"filename":"contract.txt",' +
        '"contentType":"text/plain",' +
        '"timestamp":"2024-01-01T00:00:00.000Z"' +
        '}',
      'utf-8',
    )

    const result = CheckOrderStatusHandler({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })

    await expect(result).rejects.toBeInstanceOf(PaymentConfirmationNotFound)
  })
})
