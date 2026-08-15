import 'server-only'
import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

// mjs/ejs mismatch workaround
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stripeClient = new Stripe(key) as any
