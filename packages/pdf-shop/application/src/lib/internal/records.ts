import { z } from 'zod'

export const colorSchemeSchema = z.enum(['light', 'dark'])

export const documentSpecSchema = z.object({
  colorScheme: colorSchemeSchema,
  title: z.string().max(120),
  body: z.string().max(20_000),
})

export type DocumentSpec = z.infer<typeof documentSpecSchema>

export const documentCreatedSchema = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  spec: documentSpecSchema,
  payment: z.object({
    paymentIntentId: z.string(),
    amount: z.number().int().positive(),
    currency: z.string(),
  }),
})

export type DocumentCreated = z.infer<typeof documentCreatedSchema>

export const documentGeneratedSchema = z.object({
  documentId: z.uuid(),
  path: z.string(),
  filename: z.string().optional(),
  contentType: z.string().optional(),
  timestamp: z.iso.datetime(),
})

export type DocumentGenerated = z.infer<typeof documentGeneratedSchema>

export const paymentCompletedSchema = z.object({
  documentId: z.uuid(),
  stripePaymentIntentId: z.string(),
  amount: z.number().int().positive(),
  currency: z.string(),
  confirmedAt: z.iso.datetime(),
})

export type PaymentCompleted = z.infer<typeof paymentCompletedSchema>
