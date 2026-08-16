import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type Stripe from 'stripe'
import { encodeDocumentPath } from '@org/pdf-shop-contracts'

import { createDocument } from './createDocument'
import { StripeIntegrationFailed, FileIOFailed } from './errors'
import {
  createFakeStripe,
  createTempDataRoot,
  createTestLogger,
} from '../../test-support/testEnv'

describe('createDocument', () => {
  let dataRoot: string
  let cleanup: () => Promise<void>
  const logger = createTestLogger()
  let stripe: Stripe

  beforeEach(async () => {
    ;({ dataRoot, cleanup } = await createTempDataRoot())
    stripe = createFakeStripe()
  })

  afterEach(async () => {
    await cleanup()
  })

  const input = { colorScheme: 'light' as const, title: 'Test', body: 'Body' }

  it('creates a payment intent and writes a document record', async () => {
    vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
      id: 'pi_1',
      amount: 999,
      currency: 'usd',
    } as unknown as Stripe.Response<Stripe.PaymentIntent>)

    const record = await createDocument({ stripe, dataRoot, logger })(input)

    expect(record.spec).toEqual(input)
    expect(record.payment).toEqual({
      paymentIntentId: 'pi_1',
      amount: 999,
      currency: 'usd',
    })

    const documentPath = encodeDocumentPath({
      documentId: record.id,
      version: 1,
    })
    const written = await readFile(
      path.join(dataRoot, documentPath, 'created.json'),
      'utf-8',
    )
    expect(JSON.parse(written)).toEqual(record)
  })

  it('throws StripeIntegrationFailed when Stripe fails to create the payment intent', async () => {
    vi.mocked(stripe.paymentIntents.create).mockRejectedValue(
      new Error('network error'),
    )

    await expect(
      createDocument({ stripe, dataRoot, logger })(input),
    ).rejects.toBeInstanceOf(StripeIntegrationFailed)
  })

  it('throws FileIOFailed when the document record cannot be written', async () => {
    vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
      id: 'pi_1',
      amount: 999,
      currency: 'usd',
    } as unknown as Stripe.Response<Stripe.PaymentIntent>)

    // Point dataRoot at a file instead of a directory so mkdir(recursive)
    // fails with ENOTDIR — deterministic regardless of user/root.
    const notADirectory = path.join(dataRoot, 'not-a-directory')
    await writeFile(notADirectory, '', 'utf-8')

    await expect(
      createDocument({ stripe, dataRoot: notADirectory, logger })(input),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })
})
