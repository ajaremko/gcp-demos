import { z } from 'zod'

export const SIZE_PRESET_IDS = ['social', 'square', 'thumbnail'] as const

export type SizePresetId = (typeof SIZE_PRESET_IDS)[number]

export const SIZE_PRESETS: Record<
  SizePresetId,
  { width: number; height: number; label: string }
> = {
  social: { width: 1200, height: 630, label: 'Social card (1200x630)' },
  square: { width: 1080, height: 1080, label: 'Square (1080x1080)' },
  thumbnail: { width: 1280, height: 720, label: 'Thumbnail (1280x720)' },
}

export const FONT_FAMILY_IDS = ['sans-serif', 'serif', 'monospace'] as const

export type FontFamilyId = (typeof FONT_FAMILY_IDS)[number]

const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, 'Must be a hex color, e.g. #336699')

/**
 * Validates the graphic specification submitted by the user.
 * Used by both the client preview and the server action to ensure
 * they build identical HTML.
 */
export const graphicSpecSchema = z.object({
  preset: z.enum(SIZE_PRESET_IDS),
  headline: z
    .string()
    .trim()
    .min(1, 'Headline is required')
    .max(80, 'Headline is too long'),
  subtext: z.string().trim().max(160, 'Subtext is too long'),
  fontFamily: z.enum(FONT_FAMILY_IDS),
  fontColor: hexColorSchema,
  backgroundColor: hexColorSchema,
})

export type GraphicSpec = z.infer<typeof graphicSpecSchema>

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Builds the full HTML document for a graphic spec. The renderer
 * screenshots with `fullPage: true` and no custom viewport, so the
 * output's pixel dimensions come entirely from this document's own
 * content size — the top-level container below is sized in absolute
 * pixels (not vw/vh) to match the chosen preset exactly.
 */
export function buildGraphicHtml(spec: GraphicSpec): string {
  const { width, height } = SIZE_PRESETS[spec.preset]
  const headline = escapeHtml(spec.headline)
  const subtext = escapeHtml(spec.subtext)

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { margin: 0; padding: 0; }
    </style>
  </head>
  <body>
    <div
      style="width:${width}px;height:${height}px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:48px;font-family:${spec.fontFamily};background-color:${spec.backgroundColor};color:${spec.fontColor};text-align:center;overflow:hidden;"
    >
      <div style="font-size:56px;font-weight:700;line-height:1.2;">${headline}</div>
      ${subtext ? `<div style="font-size:28px;line-height:1.4;">${subtext}</div>` : ''}
    </div>
  </body>
</html>`
}
