import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  encodeDocumentPath,
  type PaymentCompleted,
} from '@org/pdf-shop-contracts'

import { getPaymentCompleted } from './getPayment'
import { FileIOFailed } from './errors'
import { createTempDataRoot, createTestLogger } from '../../test-support/testEnv'

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
    const documentId = randomUUID()
    const record: PaymentCompleted = {
      documentId,
      stripePaymentIntentId: 'pi_1',
      amount: 999,
      currency: 'usd',
      confirmedAt: new Date().toISOString(),
    }

    const documentPath = encodeDocumentPath({ documentId, version: 1 })
    const dir = path.join(dataRoot, documentPath)
    await mkdir(dir, { recursive: true })
    await writeFile(
      path.join(dir, 'paid.json'),
      JSON.stringify(record),
      'utf-8',
    )

    const result = await getPaymentCompleted({ dataRoot, logger })({
      documentId,
    })

    expect(result).toEqual(record)
  })

  it('throws FileIOFailed when the file does not exist', async () => {
    await expect(
      getPaymentCompleted({ dataRoot, logger })({
        documentId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })

  it('throws FileIOFailed when the file contains invalid JSON', async () => {
    const documentId = randomUUID()
    const documentPath = encodeDocumentPath({ documentId, version: 1 })
    const dir = path.join(dataRoot, documentPath)
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, 'paid.json'), 'not json', 'utf-8')

    await expect(
      getPaymentCompleted({ dataRoot, logger })({ documentId }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })

  it('throws FileIOFailed when the file content fails schema validation', async () => {
    const documentId = randomUUID()
    const documentPath = encodeDocumentPath({ documentId, version: 1 })
    const dir = path.join(dataRoot, documentPath)
    await mkdir(dir, { recursive: true })
    await writeFile(
      path.join(dir, 'paid.json'),
      JSON.stringify({ foo: 'bar' }),
      'utf-8',
    )

    await expect(
      getPaymentCompleted({ dataRoot, logger })({ documentId }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })
})
