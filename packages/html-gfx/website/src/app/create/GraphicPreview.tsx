'use client'
import { useFormContext, useWatch } from 'react-hook-form'

import {
  buildGraphicHtml,
  SIZE_PRESETS,
  type GraphicSpec,
} from '@/lib/graphicSpec'

const PREVIEW_MAX_WIDTH = 480

export function GraphicPreview() {
  const { control } = useFormContext<GraphicSpec>()
  const spec = useWatch({ control })

  const { width, height } = SIZE_PRESETS[spec.preset ?? 'social']
  const html = buildGraphicHtml({
    preset: spec.preset ?? 'social',
    headline: spec.headline ?? '',
    subtext: spec.subtext ?? '',
    fontFamily: spec.fontFamily ?? 'sans-serif',
    fontColor: spec.fontColor ?? '#111111',
    backgroundColor: spec.backgroundColor ?? '#ffffff',
  })
  const scale = Math.min(1, PREVIEW_MAX_WIDTH / width)

  return (
    <div>
      <p className="mb-2 text-sm font-medium">Preview</p>
      <div
        className="overflow-hidden rounded border border-gray-300 bg-gray-50"
        style={{ width: width * scale, height: height * scale }}
      >
        <iframe
          srcDoc={html}
          title="Graphic preview"
          className="pointer-events-none origin-top-left border-0"
          style={{ width, height, transform: `scale(${scale})` }}
        />
      </div>
    </div>
  )
}
