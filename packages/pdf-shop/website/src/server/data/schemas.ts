import { z } from 'zod'

// Imported by both the client form (zodResolver) and server actions, so this
// file must stay free of server-only imports.

export const colorSchemeSchema = z.enum(['light', 'dark'])

export const documentSpecFormSchema = z.object({
  colorScheme: colorSchemeSchema,
  title: z.string().trim().min(1, 'Title is required').max(120, 'Title is too long'),
  body: z.string().trim().min(1, 'Body is required').max(20_000, 'Body is too long'),
})
export type DocumentSpecFormValues = z.infer<typeof documentSpecFormSchema>

export const documentSpecRecordSchema = documentSpecFormSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
})
export type DocumentSpecRecord = z.infer<typeof documentSpecRecordSchema>

export const paymentConfirmationRecordSchema = z.object({
  paymentConfirmationId: z.string().uuid(),
  documentSpecId: z.string().uuid(),
  stripePaymentIntentId: z.string(),
  amount: z.number().int().positive(),
  currency: z.literal('usd'),
  status: z.literal('succeeded'),
  confirmedAt: z.string().datetime(),
})
export type PaymentConfirmationRecord = z.infer<typeof paymentConfirmationRecordSchema>

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
export type GeneratedDocumentStatus = z.infer<typeof generatedDocumentStatusSchema>
