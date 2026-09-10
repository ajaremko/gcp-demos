'use client'
import { useFormContext } from 'react-hook-form'

import {
  FONT_FAMILY_IDS,
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
  type GraphicFormValues,
} from '@/lib/graphicSpec'

import { Field } from './GraphicFieldsPanel'

export function SubtextFieldsPanel({ className }: { className?: string }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<GraphicFormValues>()

  return (
    <div className={`grid grid-cols-2 gap-2 ${className ?? ''}`}>
      <Field
        label="Subtext"
        htmlFor="subtext.text"
        error={errors.subtext?.text?.message}
        className="col-span-2"
      >
        <textarea
          id="subtext.text"
          placeholder="Optional supporting text"
          rows={2}
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          {...register('subtext.text')}
        />
      </Field>

      <Field
        label="Font"
        htmlFor="subtext.fontFamily"
        error={errors.subtext?.fontFamily?.message}
      >
        <select
          id="subtext.fontFamily"
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          {...register('subtext.fontFamily')}
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
        htmlFor="subtext.fontSize"
        error={errors.subtext?.fontSize?.message}
      >
        <input
          id="subtext.fontSize"
          type="number"
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          step={1}
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          {...register('subtext.fontSize', { valueAsNumber: true })}
        />
      </Field>

      <Field
        label="Font color"
        htmlFor="subtext.fontColor"
        error={errors.subtext?.fontColor?.message}
      >
        <input
          id="subtext.fontColor"
          type="color"
          className="h-8 w-full rounded border border-gray-300"
          {...register('subtext.fontColor')}
        />
      </Field>
    </div>
  )
}
