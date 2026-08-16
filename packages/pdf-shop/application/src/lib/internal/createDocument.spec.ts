import { readFile, writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type Stripe from 'stripe'

import { createDocument } from './createDocument'
import { StripeIntegrationFailed, FileIOFailed } from './errors'
import {
  createFakeStripe,
  createTempDataRoot,
  createTestLogger,
} from '../../test-support/testEnv'

// createDocument generates its own documentId internally via randomUUID(),
// so node:crypto is mocked to make it deterministic and hardcodable below.
const { documentId } = vi.hoisted(() => ({
  documentId: '11111111-1111-4111-8111-111111111111',
}))

vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>()
  return { ...actual, randomUUID: () => documentId }
})

describe('createDocument', () => {
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

  const input = { colorScheme: 'light' as const, title: 'Test', body: 'Body' }

  it('creates a payment intent and writes a document record', async () => {
    vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
      id: 'pi_1',
      amount: 999,
      currency: 'usd',
    } as unknown as Stripe.Response<Stripe.PaymentIntent>)

    const record = await createDocument({ stripe, dataRoot, logger })(input)

    expect(record).toEqual({
      id: documentId,
      createdAt: '2024-01-01T00:00:00.000Z',
      spec: { colorScheme: 'light', title: 'Test', body: 'Body' },
      payment: { paymentIntentId: 'pi_1', amount: 999, currency: 'usd' },
    })

    const written = await readFile(
      `${dataRoot}/v1/documents/${documentId}/created.json`,
      'utf-8',
    )
    expect(written).toBe(
      `{"id":"${documentId}","createdAt":"2024-01-01T00:00:00.000Z","spec":{"colorScheme":"light","title":"Test","body":"Body"},"payment":{"paymentIntentId":"pi_1","amount":999,"currency":"usd"}}`,
    )
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
    const notADirectory = `${dataRoot}/not-a-directory`
    await writeFile(notADirectory, '', 'utf-8')

    await expect(
      createDocument({ stripe, dataRoot: notADirectory, logger })(input),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })
})
