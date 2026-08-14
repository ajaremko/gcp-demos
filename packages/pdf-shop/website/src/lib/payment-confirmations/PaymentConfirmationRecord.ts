import { z } from 'zod'

// Imported by both the client form (zodResolver) and server actions, so this
// file must stay free of server-only imports.

export const paymentConfirmationRecordSchema = z.object({
  paymentConfirmationId: z.string().uuid(),
  documentSpecId: z.string().uuid(),
  stripePaymentIntentId: z.string(),
  amount: z.number().int().positive(),
  currency: z.literal('usd'),
  status: z.literal('succeeded'),
  confirmedAt: z.string().datetime(),
})
export type PaymentConfirmationRecord = z.infer<
  typeof paymentConfirmationRecordSchema
>
