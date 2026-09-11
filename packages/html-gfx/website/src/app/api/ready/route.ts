import { checkRendererStatus } from '@/lib/renderClient'

export async function GET() {
  const status = await checkRendererStatus()
  return new Response(JSON.stringify({ status }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
