import { z } from 'astro/zod'
import type { LiveLoader } from 'astro/loaders'

import { pinoLogger } from '../logging/pino'

export const blogPostSchema = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  heroImage: z.string().url().optional(),
})

export type BlogPostData = z.infer<typeof blogPostSchema>

interface GhostPost {
  slug: string
  title: string
  excerpt: string | null
  custom_excerpt: string | null
  feature_image: string | null
  published_at: string
  updated_at: string
  html: string
}

interface GhostPostsResponse {
  posts: GhostPost[]
  errors?: Array<{ message: string }>
}

function getGhostConfig() {
  // process.env, not import.meta.env: this must read the real container
  // environment at request time (Cloud Run injects GHOST_ADMIN_URL/
  // GHOST_CONTENT_KEY as runtime env vars). import.meta.env is statically
  // inlined by Vite at `astro build` time, which happens before the
  // Docker image (and its runtime env) even exists.
  const url = process.env.GHOST_ADMIN_URL
  const key = process.env.GHOST_CONTENT_KEY
  if (!url || !key) {
    pinoLogger.fatal(
      { urlPresent: Boolean(url), keyPresent: Boolean(key) },
      'Missing required configuration: GHOST_ADMIN_URL and GHOST_CONTENT_KEY must be set to fetch blog content from Ghost',
    )
    throw new Error(
      'GHOST_ADMIN_URL and GHOST_CONTENT_KEY must be set to fetch blog content from Ghost.',
    )
  }
  const resolved = { url: url.replace(/\/+$/, ''), key }
  pinoLogger.trace(
    { url: resolved.url, keyPresent: true, keyLength: key.length },
    'Resolved Ghost config',
  )
  return resolved
}

async function fetchGhost(
  path: string,
  { treat404AsEmpty = false }: { treat404AsEmpty?: boolean } = {},
): Promise<GhostPostsResponse> {
  const { url, key } = getGhostConfig()
  const separator = path.includes('?') ? '&' : '?'
  pinoLogger.trace({ path }, 'Fetching from Ghost Content API')
  const response = await fetch(
    `${url}/ghost/api/content${path}${separator}key=${key}`,
  )
  if (response.status === 404 && treat404AsEmpty) {
    // Ghost genuinely has no matching post - not a failure, don't treat it as one
    // (a real Ghost outage/network error never gets this far to produce a clean 404).
    pinoLogger.trace(
      { path },
      'Ghost returned 404 for a single-entry lookup - treating as not found',
    )
    return { posts: [] }
  }
  if (!response.ok) {
    if (response.status === 401) {
      pinoLogger.warn(
        { path, status: response.status, statusText: response.statusText },
        'Ghost rejected the Content API key (401) - check GHOST_CONTENT_KEY',
      )
    } else {
      pinoLogger.warn(
        { path, status: response.status, statusText: response.statusText },
        'Ghost Content API request failed',
      )
    }
    throw new Error(
      `Ghost Content API request failed: ${response.status} ${response.statusText}`,
    )
  }
  const data = (await response.json()) as GhostPostsResponse
  if (data.errors?.length) {
    pinoLogger.warn(
      { path, errors: data.errors },
      'Ghost Content API returned errors',
    )
    throw new Error(data.errors.map((e) => e.message).join('; '))
  }
  pinoLogger.trace(
    { path, postCount: data.posts.length },
    'Ghost Content API request succeeded',
  )
  return data
}

function toEntry(post: GhostPost) {
  return {
    id: post.slug,
    data: {
      title: post.title,
      description: post.custom_excerpt ?? post.excerpt ?? '',
      pubDate: post.published_at,
      updatedDate: post.updated_at,
      heroImage: post.feature_image ?? undefined,
    },
    rendered: { html: post.html },
    cacheHint: {
      tags: ['ghost:posts', `ghost:post:${post.slug}`],
      lastModified: new Date(post.updated_at),
    },
  }
}

export const ghostLoader: LiveLoader<BlogPostData> = {
  name: 'ghost-content-loader',
  async loadCollection() {
    pinoLogger.trace('loadCollection() called')
    try {
      const data = await fetchGhost('/posts/?limit=all')
      pinoLogger.trace(
        { postCount: data.posts.length },
        'loadCollection() returning entries',
      )
      return {
        entries: data.posts.map(toEntry),
        cacheHint: { tags: ['ghost:posts'] },
      }
    } catch (error) {
      pinoLogger.error(
        { err: error },
        'loadCollection() failed to load posts from Ghost',
      )
      return {
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  },
  async loadEntry({ filter }) {
    pinoLogger.trace({ id: filter.id }, 'loadEntry() called')
    try {
      const data = await fetchGhost(`/posts/slug/${filter.id}/`, {
        treat404AsEmpty: true,
      })
      const post = data.posts[0]
      if (!post) {
        pinoLogger.trace(
          { id: filter.id },
          'loadEntry() found no matching post',
        )
        return undefined
      }
      pinoLogger.trace({ id: filter.id }, 'loadEntry() returning entry')
      return toEntry(post)
    } catch (error) {
      pinoLogger.error(
        { err: error, id: filter.id },
        'loadEntry() failed to load post from Ghost',
      )
      return {
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  },
}
