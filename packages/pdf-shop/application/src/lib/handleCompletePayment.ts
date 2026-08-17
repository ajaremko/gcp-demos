import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import { completePayment } from './internal/completePayment'

type CompletePayment = {
  documentId: string
  paymentIntentId: string
}

export function handleCompletePayment(env: {
  stripe: Stripe
  dataRoot: string
  logger: Logger
}) {
  return async function (input: CompletePayment) {
    const { documentId, paymentIntentId } = input
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
