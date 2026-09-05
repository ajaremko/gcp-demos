import config from '@payload-config'
import { getPayload } from 'payload'

// The admin container's startup probe (packages/blog/infra/src/service.ts)
// points here instead of at a bare TCP check on port 3000.
//
// Why it awaits getPayload() rather than just returning 200: Next's
// standalone server binds the port before it has loaded a single route
// module, so a tcpSocket probe passes while Payload is still completely
// uninitialised. The first real request then pays for the route module load,
// the drizzle schema build and the SQLite open - after Cloud Run has already
// declared the instance ready, and after startupCpuBoost has stopped
// applying. Awaiting the init here moves that work inside the startup window.
//
// getPayload() memoises its result on globalThis for the life of the process,
// so the server that later handles /api requests reuses exactly this
// instance - the probe is a warm-up, not a duplicate initialisation.
//
// Not reachable through the public gateway: nginx answers /healthz itself for
// its own probe (see the server block in service.ts) and only proxies /admin,
// /api and /_next through to this container. This route is for the
// container-level probe, which talks to port 3000 directly.

// Payload touches the database, so this must never be prerendered or cached.
export const dynamic = 'force-dynamic'

export async function GET() {
  await getPayload({ config })

  return new Response('ok', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  })
}
