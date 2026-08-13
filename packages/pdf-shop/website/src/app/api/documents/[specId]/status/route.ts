import { getGeneratedDocumentStatus } from '@/lib/generated-documents/generated-documents'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ specId: string }> },
) {
  const { specId } = await params
  const status = await getGeneratedDocumentStatus(specId)
  const ready = Boolean(status?.paid && status.pdf)
  return Response.json({ ready })
}
