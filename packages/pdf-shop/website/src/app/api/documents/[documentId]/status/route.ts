import { ZodError } from 'zod'

import {
  isApplicationError,
  CheckOrderStatusHandler,
} from '@org/pdf-shop-application'

import { pinoLogger } from '@/lib/pino'
import { resolveDataRoot } from '@/lib/dataRoot'
import { documentIdSchema } from '@/lib/schemas'

/**
 * GET /api/documents/[documentId]/status
 * Checks if the document is ready for download.
 * @returns A Response object containing the status of the document or an error message.
 */
export async function GET(
  _request: Request,
  req: { params: Promise<{ documentId: string }> },
) {
  const rawParams = await req.params
  const handler = CheckOrderStatusHandler({
    dataRoot: resolveDataRoot(),
    logger: pinoLogger,
  })
  try {
    const params = documentIdSchema.parse(rawParams)
    const ready = await handler(params)
    return Response.json({ ready })
  } catch (err) {
    if (isApplicationError(err)) {
      if (err.tag === 'GeneratedDocumentRecordNotFound') {
        // Document has not been generated yet
        return Response.json({ ready: false })
      } else if (err.tag === 'PaymentConfirmationNotFound') {
        // Document has not been paid for yet
        return Response.json({ ready: false })
      } else {
        // Unexpected application error
        pinoLogger.debug({ err }, 'Failed to check order status')
      }
      return Response.json({ ready: false })
    }
    if (err instanceof ZodError) {
      pinoLogger.warn({ err }, 'Invalid document id')
      const issues = err.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`,
      )
      return Response.json(
        { result: 'ValidationError', issues },
        { status: 400 },
      )
    }
    pinoLogger.error({ err }, 'Unexpected error checking order status')
    return Response.json({ ready: false })
  }
}
