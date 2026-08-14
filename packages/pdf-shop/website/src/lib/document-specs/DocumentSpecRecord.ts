import { z } from 'zod'

export const colorSchemeSchema = z.enum(['light', 'dark'])

export const documentSpecRecordSchema = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  colorScheme: colorSchemeSchema,
  title: z.string().max(120),
  body: z.string().max(20_000),
})

export type DocumentSpecRecord = z.infer<typeof documentSpecRecordSchema>

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

export type CreateDocumentSpec = z.infer<typeof createDocumentSpecSchema>

export const getDocumentSpecSchema = z.object({
  specId: z.uuid('Invalid specId'),
})

export type GetDocumentSpec = z.infer<typeof getDocumentSpecSchema>
