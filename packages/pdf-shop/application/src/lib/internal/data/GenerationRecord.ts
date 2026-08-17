import { z } from 'zod'

export const generationRecordSchema = z.object({
  documentId: z.uuid(),
  path: z.string(),
  filename: z.string().optional(),
  contentType: z.string().optional(),
  timestamp: z.iso.datetime(),
})

export type GenerationRecord = z.infer<typeof generationRecordSchema>
