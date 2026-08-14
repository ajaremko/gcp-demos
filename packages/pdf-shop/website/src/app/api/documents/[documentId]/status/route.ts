import { getGeneratedDocumentReadyHandler } from '@/lib/documents/GetGeneratedDocumentReady.handler'
import { FileIOFailed } from '@/lib/documents/errors'
import { ZodError } from 'zod'

export async function GET(
  _request: Request,
  req: { params: Promise<{ documentId: string }> },
) {
  const params = await req.params
  console.log('Checking document status for:', params)
  try {
    const ready = await getGeneratedDocumentReadyHandler(params)
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
    console.warn({ error: err, handler: '/api/documents/[specId]/status' })
    return Response.json({ ready: false })
  }
}
