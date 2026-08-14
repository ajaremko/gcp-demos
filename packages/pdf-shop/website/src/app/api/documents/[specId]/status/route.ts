import { getGeneratedDocumentReadyHandler } from '@/lib/documents/GetGeneratedDocumentReady.handler'

export async function GET(
  _request: Request,
  req: { params: Promise<{ documentId: string }> },
) {
  const params = await req.params
  try {
    const ready = await getGeneratedDocumentReadyHandler(params)
    return Response.json({ ready })
  } catch {
    return Response.json({ ready: false })
  }
}
