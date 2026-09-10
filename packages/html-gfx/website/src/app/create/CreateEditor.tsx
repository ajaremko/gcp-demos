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
  headline: {
    text: '',
    fontFamily: 'sans-serif',
    fontSize: 56,
    fontColor: '#111111',
  },
  subtext: {
    text: '',
    fontFamily: 'sans-serif',
    fontSize: 28,
    fontColor: '#111111',
  },
  backgroundType: 'solid',
  backgroundColor1: '#ffffff',
  backgroundColor2: '#ffffff',
  backgroundColor3: '#ffffff',
  width: SIZE_PRESETS.social.width,
  height: SIZE_PRESETS.social.height,
  ratio: SIZE_PRESETS.social.ratio,
}

const STORAGE_KEY = 'html-gfx:create-editor'

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = graphicFormSchema.safeParse(JSON.parse(raw))
      if (!parsed.success) return
      methods.reset(parsed.data)
      lastGoodSize.current = {
        width: parsed.data.width,
        height: parsed.data.height,
      }
    } catch (err) {
      // localStorage unavailable or entry corrupted — fall back to defaultValues
      console.warn('Failed to load graphic editor state from localStorage', err)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(spec))
    } catch (err) {
      // localStorage unavailable (private mode, quota) — nothing to do
      console.warn('Failed to save graphic editor state to localStorage', err)
    }
  }, [spec])

  const width = Number.isFinite(spec.width)
    ? (spec.width as number)
    : lastGoodSize.current.width
  const height = Number.isFinite(spec.height)
    ? (spec.height as number)
    : lastGoodSize.current.height

  const html = buildGraphicHtml({
    headline: {
      text: spec.headline?.text ?? '',
      fontFamily: spec.headline?.fontFamily ?? 'sans-serif',
      fontSize: spec.headline?.fontSize ?? 56,
      fontColor: spec.headline?.fontColor ?? '#111111',
    },
    subtext: {
      text: spec.subtext?.text ?? '',
      fontFamily: spec.subtext?.fontFamily ?? 'sans-serif',
      fontSize: spec.subtext?.fontSize ?? 28,
      fontColor: spec.subtext?.fontColor ?? '#111111',
    },
    backgroundType: spec.backgroundType ?? 'solid',
    backgroundColor1: spec.backgroundColor1 ?? '#ffffff',
    backgroundColor2: spec.backgroundColor2 ?? '#ffffff',
    backgroundColor3: spec.backgroundColor3 ?? '#ffffff',
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
