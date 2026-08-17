import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import { type DocumentSpec } from './internal/records'
import { getDocumentOrder } from './internal/getDocumentOrder'
import { getPaymentIntentClientSecret } from './internal/getPaymentIntentClientSecret'

type GetDocumentOrder = {
  documentId: string
}

type DocumentPaymentView = {
  documentId: string
  clientSecret: string | null
  spec: DocumentSpec
}

export function handleGetDocumentPayment(env: {
  dataRoot: string
  stripe: Stripe
  logger: Logger
}) {
  return async function (
    input: GetDocumentOrder,
  ): Promise<DocumentPaymentView> {
    const { documentId } = input
    const logger = env.logger.child({
      handler: 'handleGetDocumentPayment',
      documentId,
    })
    const localEnv = { ...env, logger }

    const document = await getDocumentOrder(localEnv)({ documentId })
    const clientSecret = await getPaymentIntentClientSecret(localEnv)(
      document.payment.paymentIntentId,
    )

    return {
      documentId: document.id,
      clientSecret,
      spec: document.spec,
    }
  }
}
