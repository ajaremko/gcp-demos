import { z } from 'zod'

import { documentSpecSchema, colorSchemeSchema } from './DocumentSpec'

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

export const createDocumentSpecSchema = z.object({
  colorScheme: colorSchemeSchema,
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(120, 'Title is too long'),
  body: z
    .string()
    .trim()
    .min(1, 'Body is required')
    .max(20_000, 'Body is too long'),
})

export type CreateDocument = z.infer<typeof createDocumentSpecSchema>

export const getDocumentSpecSchema = z.object({
  documentId: z.uuid('Invalid documentId'),
})

export type GetDocumentSpec = z.infer<typeof getDocumentSpecSchema>
