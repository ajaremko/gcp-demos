import { type Stripe } from 'stripe'

import { getGeneratedDocumentSchema } from '@org/pdf-shop-contracts'

import { getDocumentCreated } from './internal/getDocumentCreated'
import { getPaymentIntentClientSecret } from './internal/getPaymentIntentClientSecret'

export function handleGetDocumentPayment(env: {
  dataRoot: string
  stripe: Stripe
}) {
  return async function (input: object) {
    const { documentId } = getGeneratedDocumentSchema.parse(input)
    const document = await getDocumentCreated(env)({ documentId })
    const clientSecret = await getPaymentIntentClientSecret(env)(
      document.payment.paymentIntentId,
    )
    return {
      documentId: document.id,
      clientSecret,
      spec: document.spec,
    }
  }
}
