import { ZodError } from 'zod'

import {
  FileIOFailed,
  handleGetGeneratedDocumentReady,
} from '@org/pdf-shop-application'

import { pinoLogger } from '@/lib/pino'

const handler = handleGetGeneratedDocumentReady({
  dataRoot: process.env.DATA_ROOT ?? '',
  logger: pinoLogger,
})

export async function GET(
  _request: Request,
  req: { params: Promise<{ documentId: string }> },
) {
  const params = await req.params
  try {
    const ready = await handler(params)
    return Response.json({ ready })
  } catch (err) {
    if (err instanceof FileIOFailed) {
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
