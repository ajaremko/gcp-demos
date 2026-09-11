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
 * GETs the livez endpoint to check if the renderer is ready.
 */
export async function rendererReady(): Promise<boolean> {
  const url = resolveRendererApiUrl()
  try {
    const response = await fetch(`${url}/livez`)
    return response.ok
  } catch (err) {
    pinoLogger.error({ err }, 'Failed to check if renderer is ready')
    return false
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
