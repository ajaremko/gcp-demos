import { ZodError } from 'zod'

import {
  isApplicationError,
  handleCheckOrderStatus,
} from '@org/pdf-shop-application'

import { pinoLogger } from '@/lib/pino'
import { documentIdSchema } from '@/lib/schemas'

const handler = handleCheckOrderStatus({
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
    const ready = await handler(params)
    return Response.json({ ready })
  } catch (err) {
    if (isApplicationError(err)) {
      return Response.json({ ready: false })
    }
    if (err instanceof ZodError) {
      const issues = err.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`,
      )
      return Response.json(
        { result: 'ValidationError', issues },
        { status: 400 },
      )
    }
    return Response.json({ ready: false })
  }
}
