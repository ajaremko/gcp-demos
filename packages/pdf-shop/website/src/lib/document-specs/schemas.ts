import { z } from 'zod'

// Imported by both the client form (zodResolver) and server actions, so this
// file must stay free of server-only imports.

export const colorSchemeSchema = z.enum(['light', 'dark'])

export const documentSpecFormSchema = z.object({
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
export type DocumentSpecFormValues = z.infer<typeof documentSpecFormSchema>

export const documentSpecRecordSchema = documentSpecFormSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
})
export type DocumentSpecRecord = z.infer<typeof documentSpecRecordSchema>
