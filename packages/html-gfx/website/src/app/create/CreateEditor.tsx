'use client'
import { useEffect, useRef } from 'react'
import { useForm, useWatch, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  graphicFormSchema,
  buildGraphicHtml,
  SIZE_PRESETS,
  type GraphicFormValues,
} from '@/lib/graphicSpec'

import { Navbar } from './Navbar'
import { GraphicFieldsPanel } from './GraphicFieldsPanel'
import { GraphicPreview } from './GraphicPreview'

const defaultValues: GraphicFormValues = {
  headline: '',
  subtext: '',
  fontFamily: 'sans-serif',
  fontColor: '#111111',
  backgroundColor: '#ffffff',
  width: SIZE_PRESETS.social.width,
  height: SIZE_PRESETS.social.height,
  ratio: SIZE_PRESETS.social.ratio,
}

export function CreateEditor() {
  const methods = useForm<GraphicFormValues>({
    resolver: zodResolver(graphicFormSchema),
    mode: 'onBlur',
    defaultValues,
  })

  const spec = useWatch({ control: methods.control })

  const lastGoodSize = useRef({
    width: defaultValues.width,
    height: defaultValues.height,
  })
  useEffect(() => {
    if (Number.isFinite(spec.width) && Number.isFinite(spec.height)) {
      lastGoodSize.current = {
        width: spec.width as number,
        height: spec.height as number,
      }
    }
  }, [spec.width, spec.height])

  const width = Number.isFinite(spec.width)
    ? (spec.width as number)
    : lastGoodSize.current.width
  const height = Number.isFinite(spec.height)
    ? (spec.height as number)
    : lastGoodSize.current.height

  const html = buildGraphicHtml({
    headline: spec.headline ?? '',
    subtext: spec.subtext ?? '',
    fontFamily: spec.fontFamily ?? 'sans-serif',
    fontColor: spec.fontColor ?? '#111111',
    backgroundColor: spec.backgroundColor ?? '#ffffff',
    width,
    height,
  })

  return (
    <FormProvider {...methods}>
      <div className="flex h-dvh w-screen flex-col overflow-hidden">
        <Navbar html={html} />
        <div className="flex min-h-0 flex-1">
          <GraphicFieldsPanel className="w-96 shrink-0 overflow-y-auto border-r border-gray-200 p-4" />
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
