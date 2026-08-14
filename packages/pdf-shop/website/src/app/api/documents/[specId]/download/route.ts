import { Readable } from 'node:stream'
import {
  getGeneratedDocument,
  getGeneratedDocumentStream,
} from '@/lib/documents/DocumentGenerated.server'
import { getPaymentCompleted } from '@/lib/documents/PaymentCompleted.server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await params
    const document = await getGeneratedDocument({ documentId })
    const payment = await getPaymentCompleted({ documentId })

    if (!document || !payment) {
      return Response.json({ ready: false })
    }

    const resp = await getGeneratedDocumentStream({
      path: document.path,
    })

    if (!resp) {
      return new Response('File not found', { status: 404 })
    }

    const { stream, size } = resp

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        'Content-Type': document.contentType ?? 'application/pdf',
        'Content-Length': String(size),
        'Content-Disposition': `attachment; filename="${document.filename ?? `${document.documentId}.pdf`}"`,
      },
    })
  } catch {
    return new Response('File not found', { status: 404 })
  }
}
