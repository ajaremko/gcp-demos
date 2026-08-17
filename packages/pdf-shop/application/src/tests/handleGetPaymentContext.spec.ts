import { mkdir, writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type Stripe from 'stripe'

import { handleGetPaymentContext } from '../lib/handleGetPaymentContext'
import { DocumentOrderNotFound } from '../lib/internal/getDocumentOrder'
import { PaymentIntentRetrievalFailed } from '../lib/internal/getPaymentIntentClientSecret'
import {
  createFakeStripe,
  createTempDataRoot,
  createTestLogger,
} from './testEnv'

describe('handleGetPaymentContext', () => {
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

  it('validates input, reads the document, and retrieves the payment intent client secret', async () => {
    await mkdir(
      `${dataRoot}/11111111-1111-4111-8111-111111111111`,
      { recursive: true },
    )
    await writeFile(
      `${dataRoot}/11111111-1111-4111-8111-111111111111/created.json`,
      '{' +
        '"id":"11111111-1111-4111-8111-111111111111",' +
        '"createdAt":"2024-01-01T00:00:00.000Z",' +
        '"spec":{"colorScheme":"light","title":"Test Contract","body":"Body"},' +
        '"payment":{"paymentIntentId":"pi_1","amount":999,"currency":"usd"}' +
        '}',
      'utf-8',
    )
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      client_secret: 'secret_123',
    } as unknown as Stripe.Response<Stripe.PaymentIntent>)

    const result = await handleGetPaymentContext({
      stripe,
      dataRoot,
      logger,
    })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })

    expect(result).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      clientSecret: 'secret_123',
      spec: { colorScheme: 'light', title: 'Test Contract', body: 'Body' },
    })
  })

  it('propagates DocumentOrderNotFound from getDocumentOrder', async () => {
    const result = handleGetPaymentContext({ stripe, dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })

    await expect(result).rejects.toBeInstanceOf(DocumentOrderNotFound)
  })

  it('propagates PaymentIntentRetrievalFailed from getPaymentIntentClientSecret', async () => {
    await mkdir(
      `${dataRoot}/11111111-1111-4111-8111-111111111111`,
      { recursive: true },
    )
    await writeFile(
      `${dataRoot}/11111111-1111-4111-8111-111111111111/created.json`,
      '{' +
        '"id":"11111111-1111-4111-8111-111111111111",' +
        '"createdAt":"2024-01-01T00:00:00.000Z",' +
        '"spec":{"colorScheme":"light","title":"Test Contract","body":"Body"},' +
        '"payment":{"paymentIntentId":"pi_1","amount":999,"currency":"usd"}' +
        '}',
      'utf-8',
    )
    vi.mocked(stripe.paymentIntents.retrieve).mockRejectedValue(
      new Error('network error'),
    )

    const result = handleGetPaymentContext({ stripe, dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })

    await expect(result).rejects.toBeInstanceOf(PaymentIntentRetrievalFailed)
  })
})
