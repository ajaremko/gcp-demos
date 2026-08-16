import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import { completePaymentSchema } from '@org/pdf-shop-contracts'

import { completePayment } from './internal/completePayment'

export function handleCompletePayment(env: {
  stripe: Stripe
  dataRoot: string
  logger: Logger
}) {
  return async function (input: object) {
    const { documentId, paymentIntentId } = completePaymentSchema.parse(input)
    const logger = env.logger.child({
      handler: 'handleCompletePayment',
      documentId,
      paymentIntentId,
    })
    const localEnv = { ...env, logger }
    await completePayment(localEnv)({ documentId, paymentIntentId })
    return { documentId }
  }
}
