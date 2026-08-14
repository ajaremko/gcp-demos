'use server'
import { completePayment } from './PaymentCompleted.server'
import { completePaymentSchema } from './PaymentCompleted'

export async function completePaymentHandler(input: object) {
  const { documentId, paymentIntentId } = completePaymentSchema.parse(input)
  await completePayment({ documentId, paymentIntentId })
  return { documentId }
}
