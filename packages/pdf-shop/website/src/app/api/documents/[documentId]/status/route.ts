import { ZodError } from 'zod'

import {
  isApplicationError,
  CheckOrderStatusHandler,
} from '@org/pdf-shop-application'

import { pinoLogger } from '@/lib/pino'
import { resolveDataRoot } from '@/lib/dataRoot'
import { documentIdSchema } from '@/lib/schemas'

export async function GET(
  _request: Request,
  req: { params: Promise<{ documentId: string }> },
) {
  const rawParams = await req.params
  try {
    const params = documentIdSchema.parse(rawParams)
    const handler = CheckOrderStatusHandler({
      dataRoot: resolveDataRoot(),
      logger: pinoLogger,
    })
    const ready = await handler(params)
    return Response.json({ ready })
  } catch (err) {
    if (isApplicationError(err)) {
      pinoLogger.debug({ err }, 'Failed to check order status')
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
