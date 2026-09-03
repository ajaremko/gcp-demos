import { z } from 'astro/zod'
import type { LiveLoader } from 'astro/loaders'

import { fetchData, getAdminPublicUrl } from '../data/fetchData'
import { pinoLogger } from '../logging/pino'

export const blogPostSchema = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  heroImage: z.string().url().optional(),
})

export type BlogPostData = z.infer<typeof blogPostSchema>

interface Document {
  slug: string
  title: string
  excerpt: string
  heroImage: { url: string } | null
  publishedDate: string
  updatedAt: string
  contentHTML: string
}

// The admin API's media url is only relative to blog-admin's own origin
// (e.g. "/api/media/file/hero-1.jpg") when local-disk storage is in use -
// resolve it against the browser-reachable admin origin so it's a usable
// absolute <img src>. When GCS storage is enabled (production), Payload
// already returns a full absolute URL straight to the bucket - leave
// that alone rather than prepending anything onto it.
function resolveHeroImageUrl(url: string): string {
  if (/^https?:\/\//.test(url)) {
    return url
  }
  return `${getAdminPublicUrl()}${url}`
}

function toEntry(post: Document) {
  return {
    id: post.slug,
    data: {
      title: post.title,
      description: post.excerpt,
      pubDate: new Date(post.publishedDate),
      updatedDate: new Date(post.updatedAt),
      heroImage: post.heroImage?.url
        ? resolveHeroImageUrl(post.heroImage.url)
        : undefined,
    },
    rendered: { html: post.contentHTML },
    cacheHint: {
      tags: ['posts', `post:${post.slug}`],
      lastModified: new Date(post.updatedAt),
    },
  }
}

const postsLogger = pinoLogger.child({ loader: 'posts' })
const fetchPosts = fetchData<Document>(postsLogger)

/**
 * Loads blog posts from the admin API
 */
export const postsLoader: LiveLoader<BlogPostData, { id: string }> = {
  name: 'posts-loader',
  async loadCollection() {
    try {
      const data = await fetchPosts(
        '/posts?where[_status][equals]=published&limit=0&depth=1',
      )
      return {
        entries: data.docs.map(toEntry),
        cacheHint: { tags: ['posts'] },
      }
    } catch (error) {
      pinoLogger.error({ err: error }, 'failed to load posts collection')
      return {
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  },
  async loadEntry({ filter }) {
    try {
      const data = await fetchPosts(
        `/posts?where[slug][equals]=${encodeURIComponent(filter.id)}&where[_status][equals]=published&limit=1&depth=1`,
      )
      const post = data.docs[0]
      if (!post) {
        pinoLogger.trace({ id: filter.id }, 'post entry not found')
        return undefined
      }
      return toEntry(post)
    } catch (error) {
      pinoLogger.error(
        { err: error, id: filter.id },
        'failed to load post entry',
      )
      return {
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  },
}
