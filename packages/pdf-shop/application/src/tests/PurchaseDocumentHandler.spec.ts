import { writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type Stripe from 'stripe'

import { PurchaseDocumentHandler } from '../lib/PurchaseDocumentHandler'
import {
  PaymentIntentNotFound,
  PaymentIntentInvalid,
  PaymentRecordWriteFailed,
} from '../lib/internal/purchaseDocument'
import {
  createFakeStripe,
  createTempDataRoot,
  createTestLogger,
} from './testEnv'

describe('PurchaseDocumentHandler', () => {
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

  it('validates input and confirms the payment', async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      id: 'pi_1',
      status: 'succeeded',
      amount: 999,
      metadata: { documentId: '11111111-1111-4111-8111-111111111111' },
    } as unknown as Stripe.Response<Stripe.PaymentIntent>)

    const result = await PurchaseDocumentHandler({
      stripe,
      dataRoot,
      logger,
    })({
      documentId: '11111111-1111-4111-8111-111111111111',
      paymentIntentId: 'pi_1',
    })

    expect(result).toEqual({
      documentId: '11111111-1111-4111-8111-111111111111',
    })
  })

  it('propagates PaymentIntentNotFound from purchaseDocument', async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockRejectedValue(
      new Error('network error'),
    )

    const result = PurchaseDocumentHandler({ stripe, dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
      paymentIntentId: 'pi_1',
    })

    await expect(result).rejects.toBeInstanceOf(PaymentIntentNotFound)
  })

  it('propagates PaymentIntentInvalid from purchaseDocument', async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      id: 'pi_1',
      status: 'requires_payment_method',
      amount: 999,
      metadata: { documentId: '11111111-1111-4111-8111-111111111111' },
    } as unknown as Stripe.Response<Stripe.PaymentIntent>)

    const result = PurchaseDocumentHandler({ stripe, dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
      paymentIntentId: 'pi_1',
    })

    await expect(result).rejects.toBeInstanceOf(PaymentIntentInvalid)
  })

  it('propagates PaymentRecordWriteFailed from purchaseDocument', async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      id: 'pi_1',
      status: 'succeeded',
      amount: 999,
      metadata: { documentId: '11111111-1111-4111-8111-111111111111' },
    } as unknown as Stripe.Response<Stripe.PaymentIntent>)

    // Point dataRoot at a file instead of a directory so mkdir(recursive)
    // fails with ENOTDIR — deterministic regardless of user/root.
    await writeFile(`${dataRoot}/not-a-directory`, '', 'utf-8')

    const result = PurchaseDocumentHandler({
      stripe,
      dataRoot: `${dataRoot}/not-a-directory`,
      logger,
    })({
      documentId: '11111111-1111-4111-8111-111111111111',
      paymentIntentId: 'pi_1',
    })

    await expect(result).rejects.toBeInstanceOf(PaymentRecordWriteFailed)
  })
})
