import { mkdir, writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import {
  readPaymentRecord,
  PaymentConfirmationNotFound,
  PaymentConfirmationInvalid,
} from '../../lib/internal/readPaymentRecord'
import { createTempDataRoot, createTestLogger } from '../testEnv'

describe('readPaymentRecord', () => {
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
    await mkdir(`${dataRoot}/paid`, {
      recursive: true,
    })
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

    const result = await readPaymentRecord({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })

    expect(result).toEqual({
      documentId: '11111111-1111-4111-8111-111111111111',
      stripePaymentIntentId: 'pi_1',
      amount: 999,
      currency: 'usd',
      confirmedAt: '2024-01-01T00:00:00.000Z',
    })
  })

  it('throws PaymentConfirmationNotFound when the file does not exist', async () => {
    const result = readPaymentRecord({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })
    await expect(result).rejects.toBeInstanceOf(PaymentConfirmationNotFound)
  })

  it('throws PaymentConfirmationInvalid when the file contains invalid JSON', async () => {
    await mkdir(`${dataRoot}/paid`, {
      recursive: true,
    })
    await writeFile(
      `${dataRoot}/paid/11111111-1111-4111-8111-111111111111.json`,
      'not json',
      'utf-8',
    )

    const result = readPaymentRecord({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })
    await expect(result).rejects.toBeInstanceOf(PaymentConfirmationInvalid)
  })

  it('throws PaymentConfirmationInvalid when the file content fails schema validation', async () => {
    await mkdir(`${dataRoot}/paid`, {
      recursive: true,
    })
    await writeFile(
      `${dataRoot}/paid/11111111-1111-4111-8111-111111111111.json`,
      '{"foo":"bar"}',
      'utf-8',
    )

    const result = readPaymentRecord({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })
    await expect(result).rejects.toBeInstanceOf(PaymentConfirmationInvalid)
  })
})
