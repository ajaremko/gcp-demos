function resolveRendererApiUrl(): string {
  const url = process.env.RENDERER_API_URL
  if (!url) {
    throw new Error(
      'RENDERER_API_URL must be set to reach the renderer service.',
    )
  }
  return url.replace(/\/+$/, '')
}

export class RenderRequestFailed extends Error {}

/**
 * POSTs an assembled HTML document to the renderer's `/render` route.
 * The renderer expects a raw HTML string body (not JSON) with an
 * explicit `Content-Type: text/html` header, and responds with the
 * filesystem path (inside the renderer container) it saved the PNG to.
 */
export async function renderGraphic(html: string): Promise<{ path: string }> {
  const url = resolveRendererApiUrl()
  const response = await fetch(`${url}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/html' },
    body: html,
  })

  if (!response.ok) {
    throw new RenderRequestFailed(
      `Renderer request failed: ${response.status} ${response.statusText}`,
    )
  }

  return (await response.json()) as { path: string }
}
