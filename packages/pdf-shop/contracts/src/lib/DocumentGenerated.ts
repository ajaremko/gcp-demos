import { z } from 'zod'

import { documentSpecSchema } from './DocumentSpec.js'

export const documentGeneratedSchema = z.object({
  documentId: z.uuid(),
  path: z.string(),
  filename: z.string().optional(),
  contentType: z.string().optional(),
  timestamp: z.iso.datetime(),
})

export type DocumentGenerated = z.infer<typeof documentGeneratedSchema>

export const generateDocumentSchema = z.object({
  documentId: z.uuid(),
  spec: documentSpecSchema,
})

export type GenerateDocument = z.infer<typeof generateDocumentSchema>

export const getGeneratedDocumentSchema = z.object({
  documentId: z.uuid(),
})

export type GetGeneratedDocument = z.infer<typeof getGeneratedDocumentSchema>

export const getGeneratedDocumentStreamSchema = z.object({
  path: z.string(),
})

export type GetGeneratedDocumentStream = z.infer<
  typeof getGeneratedDocumentStreamSchema
>
