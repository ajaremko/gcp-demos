import { z } from 'zod'

import { documentSpecSchema } from './DocumentSpec'

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

export type OrderRecord = z.infer<typeof orderRecordSchema>
