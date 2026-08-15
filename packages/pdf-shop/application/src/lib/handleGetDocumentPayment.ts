import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import { getGeneratedDocumentSchema } from '@org/pdf-shop-contracts'

import { getDocumentCreated } from './internal/getDocumentCreated'
import { getPaymentIntentClientSecret } from './internal/getPaymentIntentClientSecret'

export function handleGetDocumentPayment(env: {
  dataRoot: string
  stripe: Stripe
  logger: Logger
}) {
  const logger = env.logger.child({ handler: 'handleGetDocumentPayment' })
  return async function (input: object) {
    const { documentId } = getGeneratedDocumentSchema.parse(input)

    logger.debug({ documentId }, 'Invoking getDocumentCreated')
    const document = await getDocumentCreated({ ...env, logger })({
      documentId,
    })

    logger.debug(
      { documentId, paymentIntentId: document.payment.paymentIntentId },
      'Invoking getPaymentIntentClientSecret',
    )
    const clientSecret = await getPaymentIntentClientSecret({
      ...env,
      logger,
    })(document.payment.paymentIntentId)

    return {
      documentId: document.id,
      clientSecret,
      spec: document.spec,
    }
  }
}
