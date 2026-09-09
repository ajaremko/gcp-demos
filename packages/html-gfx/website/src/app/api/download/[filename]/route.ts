import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import path from 'node:path'

import { z } from 'zod'

import { resolveRenderedFilesDir } from '@/lib/renderedFilesDir'

// Matches the renderer's own naming scheme (`${randomUUID()}.png`) exactly,
// so a filename can't smuggle path separators or `..` segments.
const filenameSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/i,
    'Invalid filename',
  )

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params

  const parsed = filenameSchema.safeParse(filename)
  if (!parsed.success) {
    return new Response('File not found', { status: 404 })
  }

  const filePath = path.join(resolveRenderedFilesDir(), parsed.data)

  try {
    const stats = await stat(filePath)
    const webStream = Readable.toWeb(
      createReadStream(filePath),
    ) as ReadableStream

    return new Response(webStream, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(stats.size),
        'Content-Disposition': `attachment; filename="${parsed.data}"`,
      },
    })
  } catch {
    return new Response('File not found', { status: 404 })
  }
}
