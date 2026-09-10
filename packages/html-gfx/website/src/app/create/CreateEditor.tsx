'use client'
import { useForm, useWatch, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  graphicSpecSchema,
  buildGraphicHtml,
  SIZE_PRESETS,
  type GraphicSpec,
} from '@/lib/graphicSpec'

import { Navbar } from './Navbar'
import { GraphicFieldsPanel } from './GraphicFieldsPanel'
import { GraphicPreview } from './GraphicPreview'

const defaultValues: GraphicSpec = {
  preset: 'social',
  headline: '',
  subtext: '',
  fontFamily: 'sans-serif',
  fontColor: '#111111',
  backgroundColor: '#ffffff',
}

export function CreateEditor() {
  const methods = useForm<GraphicSpec>({
    resolver: zodResolver(graphicSpecSchema),
    mode: 'onBlur',
    defaultValues,
  })

  const spec = useWatch({ control: methods.control })
  const preset = spec.preset ?? 'social'
  const { width, height } = SIZE_PRESETS[preset]
  const html = buildGraphicHtml({
    preset,
    headline: spec.headline ?? '',
    subtext: spec.subtext ?? '',
    fontFamily: spec.fontFamily ?? 'sans-serif',
    fontColor: spec.fontColor ?? '#111111',
    backgroundColor: spec.backgroundColor ?? '#ffffff',
  })

  return (
    <FormProvider {...methods}>
      <div className="flex h-dvh w-screen flex-col overflow-hidden">
        <Navbar html={html} />
        <div className="flex min-h-0 flex-1">
          <GraphicFieldsPanel className="w-96 shrink-0 overflow-y-auto border-r border-gray-200 p-6" />
          <GraphicPreview
            html={html}
            width={width}
            height={height}
            className="min-w-0 flex-1 overflow-hidden bg-gray-100 p-6"
          />
        </div>
      </div>
    </FormProvider>
  )
}
