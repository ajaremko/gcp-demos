import { ZodError } from 'zod'

import {
  FileIOFailed,
  handleGetGeneratedDocumentReady,
} from '@org/pdf-shop-application'

const handler = handleGetGeneratedDocumentReady({
  dataRoot: process.env.DATA_ROOT ?? '',
})

export async function GET(
  _request: Request,
  req: { params: Promise<{ documentId: string }> },
) {
  const params = await req.params
  console.log('Checking document status for:', params)
  try {
    const ready = await handler(params)
    return Response.json({ ready })
  } catch (err) {
    if (err instanceof FileIOFailed) {
      console.log('FileIOError:', err)
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
    console.warn({ error: err, handler: '/api/documents/[documentId]/status' })
    return Response.json({ ready: false })
  }
}
