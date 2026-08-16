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
      metadata: { documentId: '11111111-1111-4111-8111-111111111111' },
    } as unknown as Stripe.Response<Stripe.PaymentIntent>)

    const record = await completePayment({ stripe, dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
      paymentIntentId: 'pi_1',
    })

    expect(record).toEqual({
      documentId: '11111111-1111-4111-8111-111111111111',
      stripePaymentIntentId: 'pi_1',
      amount: 999,
      currency: 'usd',
      confirmedAt: '2024-01-01T00:00:00.000Z',
    })

    const written = await readFile(
      `${dataRoot}/v1/documents/11111111-1111-4111-8111-111111111111/paid.json`,
      'utf-8',
    )
    expect(written).toBe(
      '{' +
        '"documentId":"11111111-1111-4111-8111-111111111111",' +
        '"stripePaymentIntentId":"pi_1",' +
        '"amount":999,"currency":"usd",' +
        '"confirmedAt":"2024-01-01T00:00:00.000Z"' +
        '}',
    )
  })

  it('throws StripeIntegrationFailed when Stripe retrieval fails', async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockRejectedValue(
      new Error('network error'),
    )

    await expect(
      completePayment({ stripe, dataRoot, logger })({
        documentId: '11111111-1111-4111-8111-111111111111',
        paymentIntentId: 'pi_1',
      }),
    ).rejects.toBeInstanceOf(StripeIntegrationFailed)
  })

  it('throws StripeIntegrationFailed when the intent status is not succeeded', async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      id: 'pi_1',
      status: 'requires_payment_method',
      amount: 999,
      metadata: { documentId: '11111111-1111-4111-8111-111111111111' },
    } as unknown as Stripe.Response<Stripe.PaymentIntent>)

    await expect(
      completePayment({ stripe, dataRoot, logger })({
        documentId: '11111111-1111-4111-8111-111111111111',
        paymentIntentId: 'pi_1',
      }),
    ).rejects.toBeInstanceOf(StripeIntegrationFailed)
  })

  it('throws StripeIntegrationFailed when the intent metadata documentId does not match', async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      id: 'pi_1',
      status: 'succeeded',
      amount: 999,
      metadata: { documentId: '22222222-2222-4222-8222-222222222222' },
    } as unknown as Stripe.Response<Stripe.PaymentIntent>)

    await expect(
      completePayment({ stripe, dataRoot, logger })({
        documentId: '11111111-1111-4111-8111-111111111111',
        paymentIntentId: 'pi_1',
      }),
    ).rejects.toBeInstanceOf(StripeIntegrationFailed)
  })

  it('throws FileIOFailed when the payment record cannot be written', async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      id: 'pi_1',
      status: 'succeeded',
      amount: 999,
      metadata: { documentId: '11111111-1111-4111-8111-111111111111' },
    } as unknown as Stripe.Response<Stripe.PaymentIntent>)

    // Point dataRoot at a file instead of a directory so mkdir(recursive)
    // fails with ENOTDIR — deterministic regardless of user/root.
    await writeFile(`${dataRoot}/not-a-directory`, '', 'utf-8')

    await expect(
      completePayment({
        stripe,
        dataRoot: `${dataRoot}/not-a-directory`,
        logger,
      })({
        documentId: '11111111-1111-4111-8111-111111111111',
        paymentIntentId: 'pi_1',
      }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })
})
