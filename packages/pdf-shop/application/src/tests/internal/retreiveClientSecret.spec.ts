import { describe, it, expect, beforeEach, vi } from 'vitest'
import type Stripe from 'stripe'

import {
  retreiveClientSecret,
  PaymentIntentRetrievalFailed,
} from '../../lib/internal/retreiveClientSecret'
import { createFakeStripe, createTestLogger } from '../testEnv'

describe('retreiveClientSecret', () => {
  const logger = createTestLogger()
  let stripe: Stripe

  beforeEach(() => {
    stripe = createFakeStripe()
  })

  it('returns the client secret from a retrieved payment intent', async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      client_secret: 'secret_123',
    } as unknown as Stripe.Response<Stripe.PaymentIntent>)

    const result = await retreiveClientSecret({ stripe, logger })('pi_1')

    expect(result).toBe('secret_123')
    expect(stripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_1')
  })

  it('returns null when the payment intent has no client secret', async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      client_secret: null,
    } as unknown as Stripe.Response<Stripe.PaymentIntent>)

    const result = await retreiveClientSecret({ stripe, logger })('pi_1')

    expect(result).toBeNull()
  })

  it('throws PaymentIntentRetrievalFailed when Stripe retrieval fails', async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockRejectedValue(
      new Error('network error'),
    )

    const result = retreiveClientSecret({ stripe, logger })('pi_1')
    await expect(result).rejects.toBeInstanceOf(PaymentIntentRetrievalFailed)
  })
})
