import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import { completePaymentSchema } from '@org/pdf-shop-contracts'

import { completePayment } from './internal/completePayment'

export function handleCompletePayment(env: {
  stripe: Stripe
  dataRoot: string
  logger: Logger
}) {
  const logger = env.logger.child({ handler: 'handleCompletePayment' })
  return async function (input: object) {
    const { documentId, paymentIntentId } = completePaymentSchema.parse(input)
    logger.debug(
      {
        documentId,
        paymentIntentId,
      },
      'Invoking completePayment',
    )
    await completePayment({ ...env, logger })({ documentId, paymentIntentId })
    return { documentId }
  }
}
