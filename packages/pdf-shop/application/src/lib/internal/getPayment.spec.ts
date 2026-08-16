import { mkdir, writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { getPaymentCompleted } from './getPayment'
import { FileIOFailed } from './errors'
import { createTempDataRoot, createTestLogger } from '../../test-support/testEnv'

const documentId = '11111111-1111-1111-1111-111111111111'

describe('getPaymentCompleted', () => {
  let dataRoot: string
  let cleanup: () => Promise<void>
  const logger = createTestLogger()

  beforeEach(async () => {
    ;({ dataRoot, cleanup } = await createTempDataRoot())
  })

  afterEach(async () => {
    await cleanup()
  })

  it('reads and parses an existing payment confirmation file', async () => {
    await mkdir(`${dataRoot}/v1/documents/${documentId}`, { recursive: true })
    await writeFile(
      `${dataRoot}/v1/documents/${documentId}/paid.json`,
      `{"documentId":"${documentId}","stripePaymentIntentId":"pi_1","amount":999,"currency":"usd","confirmedAt":"2024-01-01T00:00:00.000Z"}`,
      'utf-8',
    )

    const result = await getPaymentCompleted({ dataRoot, logger })({
      documentId,
    })

    expect(result).toEqual({
      documentId,
      stripePaymentIntentId: 'pi_1',
      amount: 999,
      currency: 'usd',
      confirmedAt: '2024-01-01T00:00:00.000Z',
    })
  })

  it('throws FileIOFailed when the file does not exist', async () => {
    await expect(
      getPaymentCompleted({ dataRoot, logger })({ documentId }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })

  it('throws FileIOFailed when the file contains invalid JSON', async () => {
    await mkdir(`${dataRoot}/v1/documents/${documentId}`, { recursive: true })
    await writeFile(
      `${dataRoot}/v1/documents/${documentId}/paid.json`,
      'not json',
      'utf-8',
    )

    await expect(
      getPaymentCompleted({ dataRoot, logger })({ documentId }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })

  it('throws FileIOFailed when the file content fails schema validation', async () => {
    await mkdir(`${dataRoot}/v1/documents/${documentId}`, { recursive: true })
    await writeFile(
      `${dataRoot}/v1/documents/${documentId}/paid.json`,
      '{"foo":"bar"}',
      'utf-8',
    )

    await expect(
      getPaymentCompleted({ dataRoot, logger })({ documentId }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })
})
