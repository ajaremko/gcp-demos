import { z } from 'zod'

export const RATIO_IDS = ['none', '1:1', '16:9', '4:5', '3:2'] as const

export type RatioId = (typeof RATIO_IDS)[number]

export const RATIOS: Record<RatioId, { value: number | null; label: string }> = {
  none: { value: null, label: 'None (independent)' },
  '1:1': { value: 1, label: 'Square (1:1)' },
  '16:9': { value: 16 / 9, label: 'Landscape (16:9)' },
  '4:5': { value: 4 / 5, label: 'Portrait (4:5)' },
  '3:2': { value: 3 / 2, label: 'Landscape (3:2)' },
}

export const SIZE_PRESET_IDS = ['social', 'square', 'thumbnail'] as const

export type SizePresetId = (typeof SIZE_PRESET_IDS)[number]

export const SIZE_PRESETS: Record<
  SizePresetId,
  { width: number; height: number; label: string; ratio: RatioId }
> = {
  social: {
    width: 1200,
    height: 630,
    label: 'Social card (1200x630)',
    ratio: 'none',
  },
  square: {
    width: 1080,
    height: 1080,
    label: 'Square (1080x1080)',
    ratio: '1:1',
  },
  thumbnail: {
    width: 1280,
    height: 720,
    label: 'Thumbnail (1280x720)',
    ratio: '16:9',
  },
}

export const FONT_FAMILY_IDS = ['sans-serif', 'serif', 'monospace'] as const

export type FontFamilyId = (typeof FONT_FAMILY_IDS)[number]

export const BACKGROUND_TYPE_IDS = ['solid', 'gradient-2', 'gradient-3'] as const

export type BackgroundTypeId = (typeof BACKGROUND_TYPE_IDS)[number]

export const BACKGROUND_TYPE_LABELS: Record<BackgroundTypeId, string> = {
  solid: 'Solid color',
  'gradient-2': '2-color gradient',
  'gradient-3': '3-color gradient',
}

const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, 'Must be a hex color, e.g. #336699')

export const MIN_DIMENSION = 100
export const MAX_DIMENSION = 4096

const dimensionSchema = z
  .number()
  .int('Must be a whole number')
  .min(MIN_DIMENSION, `Must be at least ${MIN_DIMENSION}px`)
  .max(MAX_DIMENSION, `Must be at most ${MAX_DIMENSION}px`)

/**
 * Validates the graphic specification submitted by the user.
 * Used by both the client preview and the server action to ensure
 * they build identical HTML.
 */
export const graphicSpecSchema = z.object({
  headline: z
    .string()
    .trim()
    .min(1, 'Headline is required')
    .max(80, 'Headline is too long'),
  subtext: z.string().trim().max(160, 'Subtext is too long'),
  fontFamily: z.enum(FONT_FAMILY_IDS),
  fontColor: hexColorSchema,
  backgroundType: z.enum(BACKGROUND_TYPE_IDS),
  backgroundColor1: hexColorSchema,
  backgroundColor2: hexColorSchema,
  backgroundColor3: hexColorSchema,
  width: dimensionSchema,
  height: dimensionSchema,
})

export type GraphicSpec = z.infer<typeof graphicSpecSchema>

/**
 * Form values used only by the live editor. Extends the persisted
 * GraphicSpec with `ratio`, a client-side editing aid that drives the
 * width/height auto-recompute logic. `ratio` never reaches
 * buildGraphicHtml or the server action — graphicSpecSchema.safeParse
 * strips it automatically since it's not part of graphicSpecSchema.
 */
export const graphicFormSchema = graphicSpecSchema.extend({
  ratio: z.enum(RATIO_IDS),
})

export type GraphicFormValues = z.infer<typeof graphicFormSchema>

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function backgroundCss(spec: GraphicSpec): string {
  switch (spec.backgroundType) {
    case 'solid':
      return `background-color:${spec.backgroundColor1};`
    case 'gradient-2':
      return `background:linear-gradient(135deg, ${spec.backgroundColor1}, ${spec.backgroundColor2});`
    case 'gradient-3':
      return `background:linear-gradient(135deg, ${spec.backgroundColor1}, ${spec.backgroundColor2}, ${spec.backgroundColor3});`
  }
}

/**
 * Builds the full HTML document for a graphic spec. The renderer
 * screenshots with `fullPage: true` and no custom viewport, so the
 * output's pixel dimensions come entirely from this document's own
 * content size — the top-level container below is sized in absolute
 * pixels (not vw/vh) to match the spec's width/height exactly.
 */
export function buildGraphicHtml(spec: GraphicSpec): string {
  const { width, height } = spec
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
      style="width:${width}px;height:${height}px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:48px;font-family:${spec.fontFamily};${backgroundCss(spec)}color:${spec.fontColor};text-align:center;overflow:hidden;"
    >
      <div style="font-size:56px;font-weight:700;line-height:1.2;">${headline}</div>
      ${subtext ? `<div style="font-size:28px;line-height:1.4;">${subtext}</div>` : ''}
    </div>
  </body>
</html>`
}
