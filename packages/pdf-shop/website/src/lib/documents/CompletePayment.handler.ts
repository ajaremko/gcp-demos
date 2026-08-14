'use server'
import { completePayment } from './PaymentCompleted.server'
import { completePaymentSchema } from '@org/pdf-shop-contracts'

export async function completePaymentHandler(input: object) {
  const { documentId, paymentIntentId } = completePaymentSchema.parse(input)
  await completePayment({ documentId, paymentIntentId })
  return { documentId }
}
