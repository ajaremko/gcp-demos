import { pinoLogger } from '@/lib/server/pino'

/**
 * Directory the renderer saves generated PNGs to. In production this
 * must be a volume mounted into both the website and renderer
 * containers (see packages/html-gfx/infra/src/service.ts) — locally,
 * pointing both processes' OUTPUT_DIR at the same path on disk works
 * since they run on one machine.
 */
export function resolveRenderedFilesDir(): string {
  if (process.env.OUTPUT_DIR) {
    return process.env.OUTPUT_DIR
  }
  if (process.env.NODE_ENV === 'production') {
    pinoLogger.fatal('OUTPUT_DIR is not set')
    throw new Error('OUTPUT_DIR is not set')
  }
  return '/tmp/html-gfx-output'
}
