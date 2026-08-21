import { Readable } from 'node:stream'

import { ZodError } from 'zod'

import {
  DownloadDocumentHandler,
  isApplicationError,
} from '@org/pdf-shop-application'

import { pinoLogger } from '@/lib/server/pino'
import { resolveDataRoot } from '@/lib/server/dataRoot'
import { documentIdSchema } from '@/lib/validation/schemas'

/**
 * GET /api/documents/[documentId]/download
 * Checks if the document has been generated and paid for,
 * and if so, streams the document back to the client for
 * download.
 * @returns A Response object containing the document stream
 * or an error message.
 */
export async function GET(
  _request: Request,
  req: { params: Promise<{ documentId: string }> },
) {
  const rawParams = await req.params
  try {
    const params = documentIdSchema.parse(rawParams)
    const handler = DownloadDocumentHandler({
      dataRoot: resolveDataRoot(),
      logger: pinoLogger,
    })
    const result = await handler(params)
    pinoLogger.info({ documentId: params.documentId }, 'Document downloaded')
    const webStream = Readable.toWeb(result.stream) as ReadableStream
    const headers = {
      'Content-Type': result.contentType ?? 'application/pdf',
      'Content-Length': String(result.size),
      'Content-Disposition': `attachment; filename="${result.filename ?? `${params.documentId}.pdf`}"`,
    }
    return new Response(webStream, { headers })
  } catch (err) {
    if (isApplicationError(err)) {
      pinoLogger.debug({ err }, 'Failed to download document')
    } else if (err instanceof ZodError) {
      pinoLogger.warn({ err }, 'Invalid document id')
    } else {
      pinoLogger.error({ err }, 'Unexpected error downloading document')
    }
    return new Response('File not found', { status: 404 })
  }
}
