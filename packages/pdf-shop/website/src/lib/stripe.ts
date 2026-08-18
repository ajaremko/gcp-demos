import 'server-only'
import Stripe from 'stripe'

let stripeClient: Stripe | undefined

export function getStripeClient() {
  if (stripeClient) {
    return stripeClient
  }

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }

  // mjs/ejs mismatch workaround
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = new Stripe(key) as any
  stripeClient = client
  return client
}
