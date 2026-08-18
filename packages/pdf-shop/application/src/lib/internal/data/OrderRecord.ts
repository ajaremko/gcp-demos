import { z } from 'zod'

import { documentSpecSchema } from './DocumentSpec'

/** Zod schema for {@link OrderRecord} */
export const orderRecordSchema = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  spec: documentSpecSchema,
  payment: z.object({
    paymentIntentId: z.string(),
    amount: z.number().int().positive(),
    currency: z.string(),
  }),
})

/** The order record (`created.json`) written when a document is ordered: the requested spec plus the associated Stripe payment intent.
 * Its `id` field is a canonical documentId that threads through the rest of the document's lifecycle.
 * Writing this file is the event that triggers async document generation (via a Cloud Storage finalize notification to `worker`)
 * */
export type OrderRecord = z.infer<typeof orderRecordSchema>
