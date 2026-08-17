import { z } from 'zod'

export const colorSchemeSchema = z.enum(['light', 'dark'])

export const documentSpecSchema = z.object({
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

export type DocumentSpec = z.infer<typeof documentSpecSchema>
