'use client'
import { useFormContext } from 'react-hook-form'

import {
  FONT_FAMILY_IDS,
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
  type GraphicFormValues,
} from '@/lib/graphicSpec'

import { Field } from './GraphicFieldsPanel'

export function HeadlineFieldsPanel({ className }: { className?: string }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<GraphicFormValues>()

  return (
    <div className={`grid grid-cols-2 gap-2 ${className ?? ''}`}>
      <Field
        label="Headline"
        htmlFor="headline.text"
        error={errors.headline?.text?.message}
        className="col-span-2"
      >
        <input
          id="headline.text"
          type="text"
          placeholder="Big bold headline"
          className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-100"
          {...register('headline.text')}
        />
      </Field>

      <Field
        label="Font"
        htmlFor="headline.fontFamily"
        error={errors.headline?.fontFamily?.message}
      >
        <select
          id="headline.fontFamily"
          className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-100"
          {...register('headline.fontFamily')}
        >
          {FONT_FAMILY_IDS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Font size (px)"
        htmlFor="headline.fontSize"
        error={errors.headline?.fontSize?.message}
      >
        <input
          id="headline.fontSize"
          type="number"
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          step={1}
          className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-100"
          {...register('headline.fontSize', { valueAsNumber: true })}
        />
      </Field>

      <Field
        label="Font color"
        htmlFor="headline.fontColor"
        error={errors.headline?.fontColor?.message}
      >
        <input
          id="headline.fontColor"
          type="color"
          className="h-8 w-full rounded border border-gray-700 bg-gray-800"
          {...register('headline.fontColor')}
        />
      </Field>
    </div>
  )
}
