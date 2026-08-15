import { type Stripe } from 'stripe'

import { completePaymentSchema } from '@org/pdf-shop-contracts'

import { completePayment } from './internal/completePayment'

export function handleCompletePayment(env: {
  stripe: Stripe
  dataRoot: string
}) {
  return async function (input: object) {
    const { documentId, paymentIntentId } = completePaymentSchema.parse(input)
    await completePayment(env)({ documentId, paymentIntentId })
    return { documentId }
  }
}
