import { z } from 'astro/zod'
import type { LiveLoader } from 'astro/loaders'

import { fetchData } from '../data/fetchData'
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

function toEntry(post: Document) {
  return {
    id: post.slug,
    data: {
      title: post.title,
      description: post.excerpt,
      pubDate: new Date(post.publishedDate),
      updatedDate: new Date(post.updatedAt),
      heroImage: post.heroImage?.url ?? undefined,
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
        '/posts?where[_status][equals]=published&limit=0',
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
        `/posts?where[slug][equals]=${encodeURIComponent(filter.id)}&where[_status][equals]=published&limit=1`,
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
