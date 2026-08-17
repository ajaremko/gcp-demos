import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import { type DocumentSpec } from './internal/data/DocumentSpec'
import { readOrderRecord } from './internal/readOrderRecord'
import { retreiveClientSecret } from './internal/retreiveClientSecret'

type GetDocumentOrder = {
  documentId: string
}

type DocumentPaymentView = {
  id: string
  clientSecret: string | null
  spec: DocumentSpec
}

export function GetPaymentContextHandler(env: {
  dataRoot: string
  stripe: Stripe
  logger: Logger
}) {
  return async function (
    input: GetDocumentOrder,
  ): Promise<DocumentPaymentView> {
    const { documentId } = input
    const logger = env.logger.child({
      handler: 'GetPaymentContextHandler',
      documentId,
    })
    const localEnv = { ...env, logger }

    const document = await readOrderRecord(localEnv)({ documentId })
    const clientSecret = await retreiveClientSecret(localEnv)(
      document.payment.paymentIntentId,
    )

    return {
      id: document.id,
      clientSecret,
      spec: document.spec,
    }
  }
}
