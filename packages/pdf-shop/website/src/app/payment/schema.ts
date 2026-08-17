import { z } from 'zod'

export const completePaymentSchema = z.object({
  documentId: z.uuid(),
  paymentIntentId: z.string(),
})

export type CompletePayment = z.infer<typeof completePaymentSchema>
