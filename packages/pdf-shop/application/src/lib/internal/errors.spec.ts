import { describe, it, expect } from 'vitest'

import { FileIOFailed, StripeIntegrationFailed } from './errors'

describe('FileIOFailed', () => {
  it('carries a tag, message, and cause', () => {
    const cause = new Error('disk full')
    const err = new FileIOFailed('Failed to write file', cause)

    expect(err.tag).toBe('FileIOFailed')
    expect(err.message).toBe('Failed to write file')
    expect(err.cause).toBe(cause)
  })
})

describe('StripeIntegrationFailed', () => {
  it('carries a tag, message, and cause', () => {
    const cause = new Error('network error')
    const err = new StripeIntegrationFailed('Failed to call Stripe', cause)

    expect(err.tag).toBe('StripeIntegrationFailed')
    expect(err.message).toBe('Failed to call Stripe')
    expect(err.cause).toBe(cause)
  })
})
