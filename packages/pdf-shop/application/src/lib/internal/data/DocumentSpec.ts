import { z } from 'zod'

/** The color scheme a document can be rendered in. */
export const colorSchemeSchema = z.enum(['light', 'dark'])

/** Validates the user-provided content and styling for a document, as submitted when placing an order.
 * This is what `generateDocument` later renders into the document's actual output; it's captured once at order time and never changes afterward. */
export const documentSpecSchema = z.object({
  colorScheme: colorSchemeSchema,
  title: z.string().max(120),
  body: z.string().max(20_000),
})

/** The user-provided content and styling for a document, as submitted when placing an order.
 * This is captured once at order time and never changes afterward. */
export type DocumentSpec = z.infer<typeof documentSpecSchema>
