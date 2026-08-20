import { mkdir, writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { CheckOrderStatusHandler } from '../lib/CheckOrderStatusHandler'
import { GeneratedDocumentRecordInvalid } from '../lib/internal/readGenerationRecord'
import { PaymentConfirmationInvalid } from '../lib/internal/readPaymentRecord'
import { createTempDataRoot, createTestLogger } from './testEnv'

const documentId = '11111111-1111-4111-8111-111111111111'

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

  async function writeGeneratedRecord() {
    await mkdir(`${dataRoot}/generated`, { recursive: true })
    await writeFile(
      `${dataRoot}/generated/${documentId}.json`,
      '{' +
        `"documentId":"${documentId}",` +
        `"path":"${documentId}",` +
        '"filename":"contract.txt",' +
        '"contentType":"text/plain",' +
        '"timestamp":"2024-01-01T00:00:00.000Z"' +
        '}',
      'utf-8',
    )
  }

  async function writePaidRecord() {
    await mkdir(`${dataRoot}/paid`, { recursive: true })
    await writeFile(
      `${dataRoot}/paid/${documentId}.json`,
      '{' +
        `"documentId":"${documentId}",` +
        '"stripePaymentIntentId":"pi_1",' +
        '"amount":999,' +
        '"currency":"usd",' +
        '"confirmedAt":"2024-01-01T00:00:00.000Z"' +
        '}',
      'utf-8',
    )
  }

  it('resolves { paid: true, generated: true } when both records exist', async () => {
    await writeGeneratedRecord()
    await writePaidRecord()

    const result = await CheckOrderStatusHandler({ dataRoot, logger })({
      documentId,
    })

    expect(result).toEqual({ paid: true, generated: true })
  })

  it('resolves { paid: false, generated: true } when only generation is done', async () => {
    await writeGeneratedRecord()

    const result = await CheckOrderStatusHandler({ dataRoot, logger })({
      documentId,
    })

    expect(result).toEqual({ paid: false, generated: true })
  })

  it('resolves { paid: true, generated: false } when only payment is confirmed', async () => {
    await writePaidRecord()

    const result = await CheckOrderStatusHandler({ dataRoot, logger })({
      documentId,
    })

    expect(result).toEqual({ paid: true, generated: false })
  })

  it('resolves { paid: false, generated: false } when neither record exists', async () => {
    const result = await CheckOrderStatusHandler({ dataRoot, logger })({
      documentId,
    })

    expect(result).toEqual({ paid: false, generated: false })
  })

  it('propagates GeneratedDocumentRecordInvalid from readGenerationRecord', async () => {
    await mkdir(`${dataRoot}/generated`, { recursive: true })
    await writeFile(`${dataRoot}/generated/${documentId}.json`, 'not json', 'utf-8')

    const result = CheckOrderStatusHandler({ dataRoot, logger })({
      documentId,
    })

    await expect(result).rejects.toBeInstanceOf(GeneratedDocumentRecordInvalid)
  })

  it('propagates PaymentConfirmationInvalid from readPaymentRecord', async () => {
    await mkdir(`${dataRoot}/paid`, { recursive: true })
    await writeFile(`${dataRoot}/paid/${documentId}.json`, 'not json', 'utf-8')

    const result = CheckOrderStatusHandler({ dataRoot, logger })({
      documentId,
    })

    await expect(result).rejects.toBeInstanceOf(PaymentConfirmationInvalid)
  })
})
