'use client'
import { useFormContext, useWatch } from 'react-hook-form'

import {
  BACKGROUND_TYPE_IDS,
  BACKGROUND_TYPE_LABELS,
  type GraphicFormValues,
} from '@/lib/graphicSpec'

import { Field } from './GraphicFieldsPanel'

export function BackgroundPanel({ className }: { className?: string }) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<GraphicFormValues>()

  const backgroundType = useWatch({ control, name: 'backgroundType' })

  return (
    <div className={`grid grid-cols-2 gap-2 ${className ?? ''}`}>
      <Field label="Background type" htmlFor="backgroundType">
        <select
          id="backgroundType"
          className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-100"
          {...register('backgroundType')}
        >
          {BACKGROUND_TYPE_IDS.map((id) => (
            <option key={id} value={id}>
              {BACKGROUND_TYPE_LABELS[id]}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label={backgroundType === 'solid' ? 'Color' : 'Color 1'}
        htmlFor="backgroundColor1"
        error={errors.backgroundColor1?.message}
      >
        <input
          id="backgroundColor1"
          type="color"
          className="h-8 w-full rounded border border-gray-700 bg-gray-800"
          {...register('backgroundColor1')}
        />
      </Field>

      {backgroundType !== 'solid' && (
        <Field
          label="Color 2"
          htmlFor="backgroundColor2"
          error={errors.backgroundColor2?.message}
        >
          <input
            id="backgroundColor2"
            type="color"
            className="h-8 w-full rounded border border-gray-700 bg-gray-800"
            {...register('backgroundColor2')}
          />
        </Field>
      )}

      {backgroundType === 'gradient-3' && (
        <Field
          label="Color 3"
          htmlFor="backgroundColor3"
          error={errors.backgroundColor3?.message}
        >
          <input
            id="backgroundColor3"
            type="color"
            className="h-8 w-full rounded border border-gray-700 bg-gray-800"
            {...register('backgroundColor3')}
          />
        </Field>
      )}
    </div>
  )
}
