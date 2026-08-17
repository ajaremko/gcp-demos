import { z } from 'zod'

export const paymentRecordSchema = z.object({
  documentId: z.uuid(),
  stripePaymentIntentId: z.string(),
  amount: z.number().int().positive(),
  currency: z.string(),
  confirmedAt: z.iso.datetime(),
})

export type PaymentRecord = z.infer<typeof paymentRecordSchema>
