'use server'
import { createDocumentSpecSchema } from './DocumentCreated'
import { createDocument } from './DocumentCreated.server'

export async function createDocumentHandler(input: object) {
  const parsed = createDocumentSpecSchema.parse(input)
  const spec = await createDocument(parsed)
  return spec
}
