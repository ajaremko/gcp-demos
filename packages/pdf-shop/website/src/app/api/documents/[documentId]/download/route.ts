import { Readable } from 'node:stream'

import { handleDownloadDocument } from '@org/pdf-shop-application'

import { pinoLogger } from '@/lib/pino'
import { documentIdSchema } from '@/lib/schemas'

const handler = handleDownloadDocument({
  dataRoot: process.env.DATA_ROOT ?? '',
  logger: pinoLogger,
})

export async function GET(
  _request: Request,
  req: { params: Promise<{ documentId: string }> },
) {
  const rawParams = await req.params
  try {
    const params = documentIdSchema.parse(rawParams)
    const result = await handler(params)
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
