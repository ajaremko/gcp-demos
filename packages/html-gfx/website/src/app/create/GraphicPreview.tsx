'use client'
import { useEffect, useRef, useState } from 'react'

type GraphicPreviewProps = {
  html: string
  width: number
  height: number
  className?: string
}

export function GraphicPreview({
  html,
  width,
  height,
  className,
}: GraphicPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [debouncedHtml, setDebouncedHtml] = useState(html)

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedHtml(html), 300)
    return () => clearTimeout(timeout)
  }, [html])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width: w, height: h } = entry.contentRect
      setContainerSize({ width: w, height: h })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const scale =
    containerSize.width > 0 && containerSize.height > 0
      ? Math.min(containerSize.width / width, containerSize.height / height)
      : 0

  return (
    <div
      ref={containerRef}
      className={`flex items-center justify-center ${className ?? ''}`}
    >
      {scale > 0 && (
        <div
          className="overflow-hidden rounded border border-gray-700 bg-gray-800 shadow-lg"
          style={{ width: width * scale, height: height * scale }}
        >
          <iframe
            srcDoc={debouncedHtml}
            title="Graphic preview"
            className="pointer-events-none origin-top-left border-0"
            style={{ width, height, transform: `scale(${scale})` }}
          />
        </div>
      )}
    </div>
  )
}
