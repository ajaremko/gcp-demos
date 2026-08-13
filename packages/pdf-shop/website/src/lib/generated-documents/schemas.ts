import { z } from 'zod'

// Imported by both the client form (zodResolver) and server actions, so this
// file must stay free of server-only imports.

// READ-ONLY: written by the out-of-scope external document generator. Field
// names are a best-effort match to claude.md's description ("a boolean for
// if the document is paid for and a nullable pointer object to the
// generated pdf") — never assumed well-formed, see generated-documents.ts.
export const generatedDocumentStatusSchema = z.object({
  paid: z.boolean(),
  pdf: z
    .object({
      path: z.string(),
      filename: z.string().optional(),
      contentType: z.string().optional(),
    })
    .nullable(),
})
export type GeneratedDocumentStatus = z.infer<
  typeof generatedDocumentStatusSchema
>
