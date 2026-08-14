import {
  getGeneratedDocument,
  getGeneratedDocumentStream,
} from './DocumentGenerated.server'
import { getGeneratedDocumentSchema } from './DocumentGenerated'
import { getPaymentCompleted } from '@/lib/documents/PaymentCompleted.server'

export async function getGeneratedDocumentHandler(input: object) {
  const { documentId } = getGeneratedDocumentSchema.parse(input)
  const document = await getGeneratedDocument({ documentId })
  await getPaymentCompleted({ documentId })
  const { stream, size } = await getGeneratedDocumentStream({
    path: document.path,
  })
  return {
    stream,
    size,
    filename: document.filename,
    contentType: document.contentType,
  }
}
