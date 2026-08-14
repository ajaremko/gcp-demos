import { z } from 'zod'

export const paymentCompletedSchema = z.object({
  documentId: z.uuid(),
  stripePaymentIntentId: z.string(),
  amount: z.number().int().positive(),
  currency: z.literal('usd'),
  confirmedAt: z.iso.datetime(),
})

export type PaymentCompleted = z.infer<typeof paymentCompletedSchema>

export const completePaymentSchema = z.object({
  documentId: z.uuid(),
  paymentIntentId: z.string(),
})

export type CompletePayment = z.infer<typeof completePaymentSchema>

export const getPaymentSchema = z.object({
  documentId: z.uuid('Invalid documentId'),
})

export type GetPayment = z.infer<typeof getPaymentSchema>
