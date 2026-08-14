import { Readable } from 'node:stream'
import { getGeneratedDocumentHandler } from '@/lib/documents/GetGeneratedDocument.handler'

export async function GET(
  _request: Request,
  req: { params: Promise<{ documentId: string }> },
) {
  const params = await req.params
  try {
    const result = await getGeneratedDocumentHandler(params)
    const webStream = Readable.toWeb(result.stream) as ReadableStream
    const headers = {
      'Content-Type': result.contentType ?? 'application/pdf',
      'Content-Length': String(result.size),
      'Content-Disposition': `attachment; filename="${result.filename ?? `${params.documentId}.pdf`}"`,
    }
    return new Response(webStream, { headers })
  } catch {
    return new Response('File not found', { status: 404 })
  }
}
