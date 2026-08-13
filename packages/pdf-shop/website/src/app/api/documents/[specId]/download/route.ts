import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { getGeneratedDocumentStatus } from '@/lib/generated-documents/generated-documents'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ specId: string }> },
) {
  const { specId } = await params
  const status = await getGeneratedDocumentStatus(specId)

  if (!status?.paid || !status.pdf) {
    return new Response('Not available', { status: 404 })
  }

  let size: number
  try {
    ;({ size } = await stat(status.pdf.path))
  } catch {
    return new Response('File not found', { status: 404 })
  }

  const nodeStream = createReadStream(status.pdf.path)

  return new Response(Readable.toWeb(nodeStream) as ReadableStream, {
    headers: {
      'Content-Type': status.pdf.contentType ?? 'application/pdf',
      'Content-Length': String(size),
      'Content-Disposition': `attachment; filename="${status.pdf.filename ?? `${specId}.pdf`}"`,
    },
  })
}
