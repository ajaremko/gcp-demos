import { Readable } from 'node:stream'
import { getGeneratedDocumentStatus } from '@/lib/generated-documents/GeneratedDocumentStatus.server'
import { getGeneratedDocumentStream } from '@/lib/generated-documents/GeneratedDocument.server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ specId: string }> },
) {
  const { specId } = await params
  const status = await getGeneratedDocumentStatus(specId)

  if (!status?.paid || !status.pdf) {
    return new Response('Not available', { status: 404 })
  }

  try {
    const { stream, size } = await getGeneratedDocumentStream({
      path: status.pdf.path,
    })
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        'Content-Type': status.pdf.contentType ?? 'application/pdf',
        'Content-Length': String(size),
        'Content-Disposition': `attachment; filename="${status.pdf.filename ?? `${specId}.pdf`}"`,
      },
    })
  } catch {
    return new Response('File not found', { status: 404 })
  }
}
