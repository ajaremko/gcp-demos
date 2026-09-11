import { pinoLogger } from '@/lib/server/pino'

/**
 * Must stay in sync with the renderer's accepted `?type=` values
 * (`packages/html-gfx/renderer/src/main.ts`), which in turn match
 * Puppeteer's own `page.screenshot()` `type` option.
 */
export type ImageFormat = 'png' | 'jpeg' | 'webp'

function resolveRendererApiUrl(): string {
  const url = process.env.RENDERER_API_URL
  if (!url) {
    pinoLogger.fatal(
      'RENDERER_API_URL must be set to reach the renderer service.',
    )
    throw new Error(
      'RENDERER_API_URL must be set to reach the renderer service.',
    )
  }
  return url.replace(/\/+$/, '')
}

/**
 * Renderer health tiers, inferred from its `/livez` HTTP status:
 * 200 -> ready, 503 -> starting (server up, browser not ready yet),
 * anything else (including an unreachable renderer) -> unavailable.
 */
export type RendererStatus = 'ready' | 'starting' | 'unavailable'

/**
 * GETs the livez endpoint to determine the renderer's health tier.
 * Never rejects — any failure (including a missing RENDERER_API_URL
 * or a network error) resolves to 'unavailable'.
 */
export async function checkRendererStatus(): Promise<RendererStatus> {
  try {
    const url = resolveRendererApiUrl()
    const response = await fetch(`${url}/livez`)
    if (response.status === 200) return 'ready'
    if (response.status === 503) return 'starting'
    return 'unavailable'
  } catch (err) {
    pinoLogger.error({ err }, 'Failed to check renderer status')
    return 'unavailable'
  }
}

export class RenderRequestFailed extends Error {}

/**
 * POSTs an assembled HTML document to the renderer's `/render` route.
 * The renderer expects a raw HTML string body (not JSON) with an
 * explicit `Content-Type: text/html` header, and responds with the
 * filesystem path (inside the renderer container) it saved the PNG to.
 */
export async function renderGraphic(
  html: string,
  type: ImageFormat = 'png',
): Promise<{ path: string }> {
  const url = resolveRendererApiUrl()
  const response = await fetch(
    `${url}/render?type=${encodeURIComponent(type)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'text/html' },
      body: html,
    },
  )

  if (!response.ok) {
    throw new RenderRequestFailed(
      `Renderer request failed: ${response.status} ${response.statusText}`,
    )
  }

  return (await response.json()) as { path: string }
}
