'use client'
import { type ReactNode } from 'react'

import { PropertiesPanel } from './PropertiesPanel'
import { BackgroundPanel } from './BackgroundPanel'
import { HeadlineFieldsPanel } from './HeadlineFieldsPanel'
import { SubtextFieldsPanel } from './SubtextFieldsPanel'

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
      {error && <p className="mt-0.5 text-xs text-red-400">{error}</p>}
    </div>
  )
}

export function GraphicFieldsPanel({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-4 ${className ?? ''}`}>
      <section className="border-b border-gray-700">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Properties
        </h2>
        <PropertiesPanel className="mb-4" />
      </section>
      <section className="border-b border-gray-700">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Background
        </h2>
        <BackgroundPanel className="mb-4" />
      </section>
      <section className="border-b border-gray-700">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Headline
        </h2>
        <HeadlineFieldsPanel className="mb-4" />
      </section>
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Subtext
        </h2>
        <SubtextFieldsPanel />
      </section>
    </div>
  )
}
