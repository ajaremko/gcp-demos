import { ZodError } from 'zod'

import {
  isApplicationError,
  CheckOrderStatusHandler,
} from '@org/pdf-shop-application'

import { pinoLogger } from '@/lib/server/pino'
import { resolveDataRoot } from '@/lib/server/dataRoot'
import { documentIdSchema } from '@/lib/validation/schemas'

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
    const status = await handler(params)
    return Response.json({ ready: status.paid && status.generated, ...status })
  } catch (err) {
    if (isApplicationError(err)) {
      // Both PaymentConfirmationNotFound and GeneratedDocumentRecordNotFound
      // are handled inside CheckOrderStatusHandler and never reach here -
      // any ApplicationError that does is a genuine, unexpected failure.
      pinoLogger.debug({ err }, 'Failed to check order status')
      return Response.json({ ready: false, paid: false, generated: false })
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
    return Response.json({ ready: false, paid: false, generated: false })
  }
}
