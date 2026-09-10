'use client'
import { type ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'

import { FONT_FAMILY_IDS, type GraphicFormValues } from '@/lib/graphicSpec'

import { PropertiesPanel } from './PropertiesPanel'
import { BackgroundPanel } from './BackgroundPanel'

export function Field({
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
      <label htmlFor={htmlFor} className="mb-0.5 block text-xs font-medium">
        {label}
      </label>
      {children}
      {error && <p className="mt-0.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function GraphicFieldsPanel({ className }: { className?: string }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<GraphicFormValues>()

  return (
    <div className={`flex flex-col gap-4 ${className ?? ''}`}>
      <section className="border-b border-gray-300">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Properties
        </h2>
        <PropertiesPanel className="mb-4" />
      </section>
      <section className="border-b border-gray-300">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Background
        </h2>
        <BackgroundPanel className="mb-4" />
      </section>
      <section className="border-b border-gray-300">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Everything else
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Font"
            htmlFor="fontFamily"
            error={errors.fontFamily?.message}
          >
            <select
              id="fontFamily"
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
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
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
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
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
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
              className="h-8 w-full rounded border border-gray-300"
              {...register('fontColor')}
            />
          </Field>
        </div>
      </section>
    </div>
  )
}
