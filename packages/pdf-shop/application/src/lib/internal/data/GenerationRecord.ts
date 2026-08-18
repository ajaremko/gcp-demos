import { z } from 'zod'

/** Zod schema for {@link GenerationRecord} */
export const generationRecordSchema = z.object({
  documentId: z.uuid(),
  path: z.string(),
  filename: z.string().optional(),
  contentType: z.string().optional(),
  timestamp: z.iso.datetime(),
})

/** The generation record (`generated.json`) written after a document's content has been generated.
 * Holds metadata about the generated file including its location. */
export type GenerationRecord = z.infer<typeof generationRecordSchema>
