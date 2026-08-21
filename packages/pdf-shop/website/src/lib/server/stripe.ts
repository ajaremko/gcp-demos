import 'server-only'
import Stripe from 'stripe'

import { pinoLogger } from './pino'

let stripeClient: Stripe | undefined

export function getStripeClient() {
  if (stripeClient) {
    return stripeClient
  }

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    const err = new Error('STRIPE_SECRET_KEY is not set')
    pinoLogger.fatal({ err }, 'Missing required configuration')
    throw err
  }

  // mjs/ejs mismatch workaround
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = new Stripe(key) as any
  stripeClient = client
  return client
}
