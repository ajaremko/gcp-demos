import { z } from 'zod'

/** Zod schema for {@link PaymentRecord} */
export const paymentRecordSchema = z.object({
  documentId: z.uuid(),
  stripePaymentIntentId: z.string(),
  amount: z.number().int().positive(),
  currency: z.string(),
  confirmedAt: z.iso.datetime(),
})

/** The payment confirmation record (`paid.json`) written once a document's Stripe payment intent has succeeded.
 * Its presence is what gates access to the generated document. */
export type PaymentRecord = z.infer<typeof paymentRecordSchema>
