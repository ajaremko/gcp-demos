import { createHash, randomUUID } from 'node:crypto'
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import { join } from 'node:path'
import type {
  CacheProvider,
  CacheProviderFactory,
  InvalidateOptions,
} from 'astro'

import { pinoLogger } from '../logging/pino'

interface StoredEntry {
  path: string
  body: string
  status: number
  headers: Array<[string, string]>
  storedAt: number
  maxAge: number
  swr: number
  tags: string[]
}

function keyFor(url: URL): string {
  return createHash('sha256')
    .update(url.pathname + url.search)
    .digest('hex')
}

function parseCdnCacheControl(header: string | null): {
  maxAge: number
  swr: number
} {
  let maxAge = 0
  let swr = 0
  if (!header) return { maxAge, swr }
  for (const part of header.split(',')) {
    const trimmed = part.trim().toLowerCase()
    if (trimmed.startsWith('max-age=')) {
      maxAge = Number.parseInt(trimmed.slice(8), 10) || 0
    } else if (trimmed.startsWith('stale-while-revalidate=')) {
      swr = Number.parseInt(trimmed.slice(23), 10) || 0
    }
  }
  return { maxAge, swr }
}

function parseCacheTags(header: string | null): string[] {
  if (!header) return []
  return header
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

function isExpired(entry: StoredEntry): boolean {
  const age = (Date.now() - entry.storedAt) / 1000
  return age > entry.maxAge
}

function isStale(entry: StoredEntry): boolean {
  const age = (Date.now() - entry.storedAt) / 1000
  return age > entry.maxAge && age <= entry.maxAge + entry.swr
}

function responseFromEntry(entry: StoredEntry, cacheStatus: string): Response {
  const headers = new Headers(entry.headers)
  headers.set('X-Astro-Cache', cacheStatus)
  return new Response(entry.body, { status: entry.status, headers })
}

const filesystemCacheProvider: CacheProviderFactory<{ dir?: string }> = (
  config,
) => {
  const logger = pinoLogger.child({ provider: 'filesystem' })
  const dir = process.env.RESPONSE_CACHE_DIR || config?.dir

  if (!dir) {
    // No mounted cache directory available (e.g. local dev) - passthrough only.
    logger.trace('RESPONSE_CACHE_DIR not set, passthrough only')
    return {
      name: 'filesystem',
      async onRequest(_context, next) {
        return next()
      },
      async invalidate() {
        return
      },
    } satisfies CacheProvider
  }

  const cacheDir: string = dir

  function fileFor(hash: string): string {
    return join(cacheDir, `${hash}.json`)
  }

  async function readEntry(url: URL): Promise<StoredEntry | undefined> {
    try {
      const raw = await readFile(fileFor(keyFor(url)), 'utf-8')
      return JSON.parse(raw) as StoredEntry
    } catch {
      return undefined
    }
  }

  async function writeEntry(url: URL, entry: StoredEntry): Promise<void> {
    try {
      await mkdir(cacheDir, { recursive: true })
      const target = fileFor(keyFor(url))
      const tmp = join(cacheDir, `.${randomUUID()}.tmp`)
      logger.trace({ path: url.pathname }, 'persisting entry')
      await writeFile(tmp, JSON.stringify(entry), 'utf-8')
      await rename(tmp, target)
    } catch (error) {
      logger.debug(
        { err: error, path: url.pathname },
        'failed to persist cache entry',
      )
    }
  }

  return {
    name: 'filesystem',

    async onRequest(context, next) {
      if (context.request.method !== 'GET') {
        return next()
      }

      const url = context.url
      logger.trace(
        { method: context.request.method, path: url.pathname },
        'looking up cache entry',
      )

      const cached = await readEntry(url)

      if (cached) {
        if (!isExpired(cached)) {
          logger.trace(
            { path: url.pathname },
            'returning fresh entry from cache',
          )
          return responseFromEntry(cached, 'HIT')
        }
        if (isStale(cached)) {
          logger.trace(
            { path: url.pathname },
            'returning stale entry from cache and revalidating in background',
          )
          next()
            .then(async (fresh) => {
              const { maxAge, swr } = parseCdnCacheControl(
                fresh.headers.get('CDN-Cache-Control'),
              )
              if (maxAge > 0 && fresh.status < 500) {
                const tags = parseCacheTags(fresh.headers.get('Cache-Tag'))
                const body = await fresh.clone().text()
                logger.trace(
                  { path: url.pathname },
                  'writing fresh cache entry',
                )
                await writeEntry(url, {
                  path: url.pathname,
                  body,
                  status: fresh.status,
                  headers: [...fresh.headers.entries()],
                  storedAt: Date.now(),
                  maxAge,
                  swr,
                  tags,
                })
              }
            })
            .catch((error) => {
              logger.debug(
                { err: error, path: url.pathname },
                'background revalidation failed',
              )
            })
          return responseFromEntry(cached, 'STALE')
        }
        logger.trace({ path: url.pathname }, 'entry stale past swr window')
      }

      const response = await next()

      if (response.status >= 500) {
        if (cached) {
          // Origin failed and we have a previously-cached copy, however old - serve it
          // rather than the failure. This is the whole point of this provider: it's
          // what lets Ghost's Cloud Run service scale to zero without visitors seeing
          // a broken blog during its cold start.
          logger.trace(
            { path: url.pathname, status: response.status },
            'origin failed, serving STALE-ERROR fallback',
          )
          return responseFromEntry(cached, 'STALE-ERROR')
        }
        logger.trace(
          { path: url.pathname, status: response.status },
          'origin failed and no cached copy exists, passing through',
        )
        return response
      }

      const { maxAge, swr } = parseCdnCacheControl(
        response.headers.get('CDN-Cache-Control'),
      )
      if (maxAge > 0) {
        const tags = parseCacheTags(response.headers.get('Cache-Tag'))
        const [forCache, forClient] = [response.clone(), response]
        const body = await forCache.text()
        await writeEntry(url, {
          path: url.pathname,
          body,
          status: forCache.status,
          headers: [...forCache.headers.entries()],
          storedAt: Date.now(),
          maxAge,
          swr,
          tags,
        })
        forClient.headers.set('X-Astro-Cache', 'MISS')
        logger.trace(
          { path: url.pathname, maxAge, swr },
          'MISS, stored fresh response',
        )
        return forClient
      }

      logger.trace({ path: url.pathname }, 'no maxAge configured, not caching')
      return response
    },

    async invalidate(options: InvalidateOptions) {
      logger.trace({ options }, 'invalidate() called')
      let files: string[]
      try {
        files = await readdir(cacheDir)
      } catch (error) {
        logger.debug({ err: error }, 'invalidate() failed to list cache dir')
        return
      }
      const tagsToInvalidate = options.tags
        ? Array.isArray(options.tags)
          ? options.tags
          : [options.tags]
        : []
      for (const file of files) {
        if (!file.endsWith('.json')) continue
        const filePath = join(cacheDir, file)
        try {
          const content = await readFile(filePath, 'utf-8')
          const entry = JSON.parse(content) as StoredEntry
          const pathMatches = options.path && entry.path === options.path
          const tagMatches = tagsToInvalidate.some((tag) =>
            entry.tags.includes(tag),
          )
          if (pathMatches || tagMatches) {
            await rm(filePath, { force: true })
            logger.trace({ path: entry.path, file }, 'invalidated entry')
          } else {
            logger.trace(
              { path: entry.path, file },
              'invalidate() considered entry, no match',
            )
          }
        } catch (error) {
          // Corrupt/unreadable entry - leave it, not worth failing invalidation over.
          logger.debug(
            { err: error, file },
            'invalidate() could not read entry, leaving it',
          )
        }
      }
    },
  } satisfies CacheProvider
}

export default filesystemCacheProvider
