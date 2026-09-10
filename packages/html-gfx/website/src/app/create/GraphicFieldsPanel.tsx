'use client'
import { type ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'

import {
  SIZE_PRESET_IDS,
  SIZE_PRESETS,
  FONT_FAMILY_IDS,
  type GraphicSpec,
} from '@/lib/graphicSpec'

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

export function GraphicFieldsPanel({ className }: { className?: string }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<GraphicSpec>()

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-4">
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
      </div>
    </div>
  )
}
