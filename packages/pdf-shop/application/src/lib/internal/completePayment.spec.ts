import { readFile, writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type Stripe from 'stripe'

import { completePayment } from './completePayment'
import { StripeIntegrationFailed, FileIOFailed } from './errors'
import {
  createFakeStripe,
  createTempDataRoot,
  createTestLogger,
} from '../../test-support/testEnv'

const documentId = '11111111-1111-1111-1111-111111111111'
const otherDocumentId = '22222222-2222-2222-2222-222222222222'

describe('completePayment', () => {
  let dataRoot: string
  let cleanup: () => Promise<void>
  const logger = createTestLogger()
  let stripe: Stripe

  beforeEach(async () => {
    ;({ dataRoot, cleanup } = await createTempDataRoot())
    stripe = createFakeStripe()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'))
  })

  afterEach(async () => {
    vi.useRealTimers()
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

    expect(record).toEqual({
      documentId,
      stripePaymentIntentId: 'pi_1',
      amount: 999,
      currency: 'usd',
      confirmedAt: '2024-01-01T00:00:00.000Z',
    })

    const written = await readFile(
      `${dataRoot}/v1/documents/${documentId}/paid.json`,
      'utf-8',
    )
    expect(written).toBe(
      `{"documentId":"${documentId}","stripePaymentIntentId":"pi_1","amount":999,"currency":"usd","confirmedAt":"2024-01-01T00:00:00.000Z"}`,
    )
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
      metadata: { documentId: otherDocumentId },
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

    const notADirectory = `${dataRoot}/not-a-directory`
    await writeFile(notADirectory, '', 'utf-8')

    await expect(
      completePayment({ stripe, dataRoot: notADirectory, logger })({
        documentId,
        paymentIntentId: 'pi_1',
      }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })
})
