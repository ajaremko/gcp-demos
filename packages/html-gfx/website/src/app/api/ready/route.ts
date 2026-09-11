import { rendererReady } from '@/lib/renderClient'
import { pinoLogger } from '@/lib/server/pino'

export async function GET() {
  try {
    const ready = await rendererReady()
    return new Response(JSON.stringify({ ready }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    pinoLogger.error({ err }, 'Failed to check if renderer is ready')
    return new Response(JSON.stringify({ ready: false }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}
