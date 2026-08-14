import { z } from 'zod'

export const colorSchemeSchema = z.enum(['light', 'dark'])

export const documentSpecSchema = z.object({
  colorScheme: colorSchemeSchema,
  title: z.string().max(120),
  body: z.string().max(20_000),
})

export type DocumentSpec = z.infer<typeof documentSpecSchema>
