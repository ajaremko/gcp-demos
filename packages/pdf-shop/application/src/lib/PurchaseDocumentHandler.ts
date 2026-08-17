import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import { purchaseDocument } from './internal/purchaseDocument'

type CompletePayment = {
  documentId: string
  paymentIntentId: string
}

export function PurchaseDocumentHandler(env: {
  stripe: Stripe
  dataRoot: string
  logger: Logger
}) {
  return async function (input: CompletePayment) {
    const { documentId, paymentIntentId } = input
    const logger = env.logger.child({
      handler: 'PurchaseDocumentHandler',
      documentId,
      paymentIntentId,
    })
    const localEnv = { ...env, logger }
    await purchaseDocument(localEnv)({ documentId, paymentIntentId })
    return { documentId }
  }
}
