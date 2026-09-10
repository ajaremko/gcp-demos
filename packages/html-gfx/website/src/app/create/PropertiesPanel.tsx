'use client'
import { type ChangeEvent } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import {
  SIZE_PRESET_IDS,
  SIZE_PRESETS,
  RATIO_IDS,
  RATIOS,
  MIN_DIMENSION,
  MAX_DIMENSION,
  type GraphicFormValues,
  type SizePresetId,
  type RatioId,
} from '@/lib/graphicSpec'

import { Field } from './GraphicFieldsPanel'

export function PropertiesPanel({ className }: { className?: string }) {
  const {
    register,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useFormContext<GraphicFormValues>()

  const width = useWatch({ control, name: 'width' })
  const height = useWatch({ control, name: 'height' })
  const matchedPreset = SIZE_PRESET_IDS.find(
    (id) =>
      SIZE_PRESETS[id].width === width && SIZE_PRESETS[id].height === height,
  )

  function handlePresetChange(event: ChangeEvent<HTMLSelectElement>) {
    const id = event.target.value
    if (!SIZE_PRESET_IDS.includes(id as SizePresetId)) return
    const preset = SIZE_PRESETS[id as SizePresetId]
    setValue('width', preset.width, { shouldValidate: true, shouldDirty: true })
    setValue('height', preset.height, {
      shouldValidate: true,
      shouldDirty: true,
    })
    setValue('ratio', preset.ratio, { shouldValidate: true, shouldDirty: true })
  }

  function handleRatioChange(event: ChangeEvent<HTMLSelectElement>) {
    const ratioValue = RATIOS[event.target.value as RatioId].value
    if (ratioValue === null) return
    const currentWidth = getValues('width')
    if (!Number.isFinite(currentWidth) || currentWidth <= 0) return
    setValue('height', Math.round(currentWidth / ratioValue), {
      shouldValidate: true,
      shouldDirty: true,
    })
  }

  function handleWidthChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value
    if (raw === '') return
    const ratioValue = RATIOS[getValues('ratio')].value
    if (ratioValue === null) return
    const nextWidth = Number(raw)
    if (!Number.isFinite(nextWidth) || nextWidth <= 0) return
    setValue('height', Math.round(nextWidth / ratioValue), {
      shouldValidate: true,
      shouldDirty: true,
    })
  }

  function handleHeightChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value
    if (raw === '') return
    const ratioValue = RATIOS[getValues('ratio')].value
    if (ratioValue === null) return
    const nextHeight = Number(raw)
    if (!Number.isFinite(nextHeight) || nextHeight <= 0) return
    setValue('width', Math.round(nextHeight * ratioValue), {
      shouldValidate: true,
      shouldDirty: true,
    })
  }

  return (
    <div className={`grid grid-cols-2 gap-2 ${className ?? ''}`}>
      <Field label="Size" htmlFor="preset">
        <select
          id="preset"
          className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-100"
          value={matchedPreset ?? 'custom'}
          onChange={handlePresetChange}
        >
          <option value="custom" disabled>
            Custom
          </option>
          {SIZE_PRESET_IDS.map((id) => (
            <option key={id} value={id}>
              {SIZE_PRESETS[id].label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Aspect ratio" htmlFor="ratio" error={errors.ratio?.message}>
        <select
          id="ratio"
          className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-100"
          {...register('ratio', { onChange: handleRatioChange })}
        >
          {RATIO_IDS.map((id) => (
            <option key={id} value={id}>
              {RATIOS[id].label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Width (px)" htmlFor="width" error={errors.width?.message}>
        <input
          id="width"
          type="number"
          min={MIN_DIMENSION}
          max={MAX_DIMENSION}
          step={1}
          className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-100"
          {...register('width', {
            valueAsNumber: true,
            onChange: handleWidthChange,
          })}
        />
      </Field>

      <Field
        label="Height (px)"
        htmlFor="height"
        error={errors.height?.message}
      >
        <input
          id="height"
          type="number"
          min={MIN_DIMENSION}
          max={MAX_DIMENSION}
          step={1}
          className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-100"
          {...register('height', {
            valueAsNumber: true,
            onChange: handleHeightChange,
          })}
        />
      </Field>
    </div>
  )
}
