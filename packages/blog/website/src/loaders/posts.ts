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
  tags: z
    .array(z.object({ name: z.string(), slug: z.string() }))
    .default([]),
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
  // Populated objects thanks to `depth=1` on every query below - but bare
  // IDs if the admin's `tags` collection ever stops granting public read,
  // which Payload does silently rather than erroring. See `toEntry`.
  tags: Array<{ name: string; slug: string } | number> | null
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
  // Drop anything that came back unpopulated rather than letting a schema
  // validation failure take the whole listing down with it - a taxonomy
  // misconfiguration should cost the chips, not the blog. Degrades the
  // same way a missing heroImage does.
  const tags = (post.tags ?? [])
    .filter(
      (tag): tag is { name: string; slug: string } =>
        typeof tag === 'object' && tag !== null,
    )
    .map(({ name, slug }) => ({ name, slug }))

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
      tags,
    },
    rendered: { html: post.contentHTML },
    cacheHint: {
      tags: [
        'posts',
        `post:${post.slug}`,
        ...tags.map((tag) => `tag:${tag.slug}`),
      ],
      lastModified: new Date(post.updatedAt),
    },
  }
}

const postsLogger = pinoLogger.child({ loader: 'posts' })
const fetchPosts = fetchData<Document>(postsLogger)

/**
 * Loads blog posts from the admin API.
 *
 * The collection accepts an optional `{ tag }` filter, which narrows the
 * query to posts carrying that tag slug. Filtering happens in Payload
 * rather than here so a tag page never has to pull down every post.
 */
export const postsLoader: LiveLoader<
  BlogPostData,
  { id: string },
  { tag?: string }
> = {
  name: 'posts-loader',
  async loadCollection({ filter }) {
    try {
      const tag = filter?.tag
      const data = await fetchPosts(
        '/posts?where[_status][equals]=published&limit=0&depth=1' +
          (tag
            ? `&where[tags.slug][equals]=${encodeURIComponent(tag)}`
            : ''),
      )
      return {
        entries: data.docs.map(toEntry),
        cacheHint: { tags: tag ? ['posts', `tag:${tag}`] : ['posts'] },
      }
    } catch (error) {
      pinoLogger.error(
        { err: error, tag: filter?.tag },
        'failed to load posts collection',
      )
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
