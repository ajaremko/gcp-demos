import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import path from 'node:path'

import { z } from 'zod'

import { resolveRenderedFilesDir } from '@/lib/renderedFilesDir'
import { pinoLogger } from '@/lib/server/pino'

// Matches the renderer's own naming scheme (`${randomUUID()}.<format>`)
// exactly, so a filename can't smuggle path separators or `..` segments.
// The extension must be one of the image formats the renderer can produce.
const FILENAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpeg|webp)$/i

const filenameSchema = z.string().regex(FILENAME_PATTERN, 'Invalid filename')

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params

  const parsed = filenameSchema.safeParse(filename)
  if (!parsed.success) {
    pinoLogger.warn({ filename }, 'Rejected invalid download filename')
    return new Response('File not found', { status: 404 })
  }

  const filePath = path.join(resolveRenderedFilesDir(), parsed.data)
  const extension = parsed.data.match(FILENAME_PATTERN)?.[1] ?? 'png'

  try {
    const stats = await stat(filePath)
    const webStream = Readable.toWeb(
      createReadStream(filePath),
    ) as ReadableStream

    return new Response(webStream, {
      headers: {
        'Content-Type': CONTENT_TYPES[extension] ?? 'application/octet-stream',
        'Content-Length': String(stats.size),
        'Content-Disposition': `attachment; filename="${parsed.data}"`,
      },
    })
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
      pinoLogger.warn({ filePath }, 'Requested file not found')
    } else {
      pinoLogger.error({ err, filePath }, 'Unexpected error reading rendered file')
    }
    return new Response('File not found', { status: 404 })
  }
}
