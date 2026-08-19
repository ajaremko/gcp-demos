import { readFile, writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type Stripe from 'stripe'

import { OrderDocumentHandler } from '../lib/OrderDocumentHandler'
import {
  PaymentIntentCreationFailed,
  OrderRecordWriteFailed,
} from '../lib/internal/orderDocument'
import {
  createFakeStripe,
  createTempDataRoot,
  createTestLogger,
} from './testEnv'

// orderDocument (wrapped by OrderDocumentHandler) generates its own
// documentId internally via randomUUID(), so node:crypto is mocked to make
// it deterministic and hardcodable below.
vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>()
  return { ...actual, randomUUID: () => '11111111-1111-4111-8111-111111111111' }
})

describe('OrderDocumentHandler', () => {
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

  it('validates input, creates a payment intent, and writes a document record', async () => {
    vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
      id: 'pi_1',
      amount: 999,
      currency: 'usd',
    } as unknown as Stripe.Response<Stripe.PaymentIntent>)

    const record = await OrderDocumentHandler({ stripe, dataRoot, logger })({
      colorScheme: 'light',
      title: 'Test',
      body: 'Body',
    })

    expect(record).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      createdAt: '2024-01-01T00:00:00.000Z',
      spec: { colorScheme: 'light', title: 'Test', body: 'Body' },
      payment: { paymentIntentId: 'pi_1', amount: 999, currency: 'usd' },
    })

    const written = await readFile(
      `${dataRoot}/created/11111111-1111-4111-8111-111111111111.json`,
      'utf-8',
    )
    expect(written).toBe(
      '{' +
        '"id":"11111111-1111-4111-8111-111111111111",' +
        '"createdAt":"2024-01-01T00:00:00.000Z",' +
        '"spec":{"colorScheme":"light","title":"Test","body":"Body"},' +
        '"payment":{"paymentIntentId":"pi_1","amount":999,"currency":"usd"}' +
        '}',
    )
  })

  it('propagates PaymentIntentCreationFailed from orderDocument', async () => {
    vi.mocked(stripe.paymentIntents.create).mockRejectedValue(
      new Error('network error'),
    )

    const result = OrderDocumentHandler({ stripe, dataRoot, logger })({
      colorScheme: 'light',
      title: 'Test',
      body: 'Body',
    })

    await expect(result).rejects.toBeInstanceOf(PaymentIntentCreationFailed)
  })

  it('propagates OrderRecordWriteFailed from orderDocument', async () => {
    vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
      id: 'pi_1',
      amount: 999,
      currency: 'usd',
    } as unknown as Stripe.Response<Stripe.PaymentIntent>)

    // Point dataRoot at a file instead of a directory so mkdir(recursive)
    // fails with ENOTDIR — deterministic regardless of user/root.
    await writeFile(`${dataRoot}/not-a-directory`, '', 'utf-8')

    const result = OrderDocumentHandler({
      stripe,
      dataRoot: `${dataRoot}/not-a-directory`,
      logger,
    })({
      colorScheme: 'light',
      title: 'Test',
      body: 'Body',
    })

    await expect(result).rejects.toBeInstanceOf(OrderRecordWriteFailed)
  })
})
