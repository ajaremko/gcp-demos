import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type Stripe from 'stripe'
import { encodeDocumentPath } from '@org/pdf-shop-contracts'

import { completePayment } from './completePayment'
import { StripeIntegrationFailed, FileIOFailed } from './errors'
import {
  createFakeStripe,
  createTempDataRoot,
  createTestLogger,
} from '../../test-support/testEnv'

describe('completePayment', () => {
  let dataRoot: string
  let cleanup: () => Promise<void>
  const logger = createTestLogger()
  let stripe: Stripe
  let documentId: string

  beforeEach(async () => {
    ;({ dataRoot, cleanup } = await createTempDataRoot())
    stripe = createFakeStripe()
    documentId = randomUUID()
  })

  afterEach(async () => {
    await cleanup()
  })

  it('writes a payment confirmation record when the intent succeeded', async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      id: 'pi_1',
      status: 'succeeded',
      amount: 999,
      metadata: { documentId },
    } as unknown as Stripe.Response<Stripe.PaymentIntent>)

    const record = await completePayment({ stripe, dataRoot, logger })({
      documentId,
      paymentIntentId: 'pi_1',
    })

    expect(record).toMatchObject({
      documentId,
      stripePaymentIntentId: 'pi_1',
      amount: 999,
      currency: 'usd',
    })

    const documentPath = encodeDocumentPath({ documentId, version: 1 })
    const written = await readFile(
      path.join(dataRoot, documentPath, 'paid.json'),
      'utf-8',
    )
    expect(JSON.parse(written)).toEqual(record)
  })

  it('throws StripeIntegrationFailed when Stripe retrieval fails', async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockRejectedValue(
      new Error('network error'),
    )

    await expect(
      completePayment({ stripe, dataRoot, logger })({
        documentId,
        paymentIntentId: 'pi_1',
      }),
    ).rejects.toBeInstanceOf(StripeIntegrationFailed)
  })

  it('throws StripeIntegrationFailed when the intent status is not succeeded', async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      id: 'pi_1',
      status: 'requires_payment_method',
      amount: 999,
      metadata: { documentId },
    } as unknown as Stripe.Response<Stripe.PaymentIntent>)

    await expect(
      completePayment({ stripe, dataRoot, logger })({
        documentId,
        paymentIntentId: 'pi_1',
      }),
    ).rejects.toBeInstanceOf(StripeIntegrationFailed)
  })

  it('throws StripeIntegrationFailed when the intent metadata documentId does not match', async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      id: 'pi_1',
      status: 'succeeded',
      amount: 999,
      metadata: { documentId: randomUUID() },
    } as unknown as Stripe.Response<Stripe.PaymentIntent>)

    await expect(
      completePayment({ stripe, dataRoot, logger })({
        documentId,
        paymentIntentId: 'pi_1',
      }),
    ).rejects.toBeInstanceOf(StripeIntegrationFailed)
  })

  it('throws FileIOFailed when the payment record cannot be written', async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      id: 'pi_1',
      status: 'succeeded',
      amount: 999,
      metadata: { documentId },
    } as unknown as Stripe.Response<Stripe.PaymentIntent>)

    const notADirectory = path.join(dataRoot, 'not-a-directory')
    await writeFile(notADirectory, '', 'utf-8')

    await expect(
      completePayment({ stripe, dataRoot: notADirectory, logger })({
        documentId,
        paymentIntentId: 'pi_1',
      }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })
})
