import { getGeneratedDocument } from '@/lib/documents/DocumentGenerated.server'
import { getPaymentCompleted } from '@/lib/documents/PaymentCompleted.server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params
  const document = await getGeneratedDocument({ documentId })
  const payment = await getPaymentCompleted({ documentId })
  const ready = Boolean(document && payment)
  return Response.json({ ready })
}
