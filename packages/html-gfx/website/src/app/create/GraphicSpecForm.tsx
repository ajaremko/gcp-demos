'use client'
import { type ReactNode } from 'react'
import { useActionState } from 'react'
import { useForm, useFormContext, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  graphicSpecSchema,
  SIZE_PRESET_IDS,
  SIZE_PRESETS,
  FONT_FAMILY_IDS,
  type GraphicSpec,
} from '@/lib/graphicSpec'

import { createGraphicAction, type CreateGraphicActionState } from './actions'
import { GraphicPreview } from './GraphicPreview'

const initialState: CreateGraphicActionState = { errors: {} }

const defaultValues: GraphicSpec = {
  preset: 'social',
  headline: '',
  subtext: '',
  fontFamily: 'sans-serif',
  fontColor: '#111111',
  backgroundColor: '#ffffff',
}

function Field({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

function GraphicFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<GraphicSpec>()

  return (
    <>
      <Field label="Size" htmlFor="preset" error={errors.preset?.message}>
        <select
          id="preset"
          className="w-full rounded border border-gray-300 px-3 py-2"
          {...register('preset')}
        >
          {SIZE_PRESET_IDS.map((id) => (
            <option key={id} value={id}>
              {SIZE_PRESETS[id].label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Font"
        htmlFor="fontFamily"
        error={errors.fontFamily?.message}
      >
        <select
          id="fontFamily"
          className="w-full rounded border border-gray-300 px-3 py-2"
          {...register('fontFamily')}
        >
          {FONT_FAMILY_IDS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Headline"
        htmlFor="headline"
        error={errors.headline?.message}
        className="col-span-2"
      >
        <input
          id="headline"
          type="text"
          placeholder="Big bold headline"
          className="w-full rounded border border-gray-300 px-3 py-2"
          {...register('headline')}
        />
      </Field>

      <Field
        label="Subtext"
        htmlFor="subtext"
        error={errors.subtext?.message}
        className="col-span-2"
      >
        <textarea
          id="subtext"
          placeholder="Optional supporting text"
          rows={2}
          className="w-full rounded border border-gray-300 px-3 py-2"
          {...register('subtext')}
        />
      </Field>

      <Field
        label="Font color"
        htmlFor="fontColor"
        error={errors.fontColor?.message}
      >
        <input
          id="fontColor"
          type="color"
          className="h-10 w-full rounded border border-gray-300"
          {...register('fontColor')}
        />
      </Field>

      <Field
        label="Background color"
        htmlFor="backgroundColor"
        error={errors.backgroundColor?.message}
      >
        <input
          id="backgroundColor"
          type="color"
          className="h-10 w-full rounded border border-gray-300"
          {...register('backgroundColor')}
        />
      </Field>
    </>
  )
}

export function GraphicSpecForm() {
  const [state, formAction, isPending] = useActionState(
    createGraphicAction,
    initialState,
  )

  const methods = useForm<GraphicSpec>({
    resolver: zodResolver(graphicSpecSchema),
    errors: state.errors,
    mode: 'onBlur',
    defaultValues,
  })

  return (
    <FormProvider {...methods}>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <form action={formAction} className="grid h-fit grid-cols-2 gap-4">
          <GraphicFields />

          {state.message && (
            <p className="col-span-2 text-sm text-red-600">{state.message}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="col-span-2 rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {isPending ? 'Generating…' : 'Generate graphic'}
          </button>
        </form>

        <GraphicPreview />
      </div>
    </FormProvider>
  )
}
