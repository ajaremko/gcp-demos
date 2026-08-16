import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import {
  getGeneratedDocumentSchema,
  type DocumentSpec,
} from '@org/pdf-shop-contracts'

import { getDocumentCreated } from './internal/getDocumentCreated'
import { getPaymentIntentClientSecret } from './internal/getPaymentIntentClientSecret'

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
  return async function (input: object): Promise<DocumentPaymentView> {
    const { documentId } = getGeneratedDocumentSchema.parse(input)
    const logger = env.logger.child({
      handler: 'handleGetDocumentPayment',
      documentId,
    })
    const localEnv = { ...env, logger }

    const document = await getDocumentCreated(localEnv)({ documentId })
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
