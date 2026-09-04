import { z } from 'astro/zod'
import type { LiveLoader } from 'astro/loaders'

import { fetchData } from '../data/fetchData'
import { pinoLogger } from '../logging/pino'

export const tagSchema = z.object({
  name: z.string(),
  slug: z.string(),
})

export type TagData = z.infer<typeof tagSchema>

interface Document {
  name: string
  slug: string
  updatedAt: string
}

function toEntry(tag: Document) {
  return {
    id: tag.slug,
    data: {
      name: tag.name,
      slug: tag.slug,
    },
    cacheHint: {
      tags: ['tags', `tag:${tag.slug}`],
      lastModified: new Date(tag.updatedAt),
    },
  }
}

const tagsLogger = pinoLogger.child({ loader: 'tags' })
const fetchTags = fetchData<Document>(tagsLogger)

/**
 * Loads tags from the admin API.
 *
 * Tags have no draft state, so - unlike posts - there's no `_status`
 * filter to apply here.
 */
export const tagsLoader: LiveLoader<TagData, { id: string }> = {
  name: 'tags-loader',
  async loadCollection() {
    try {
      const data = await fetchTags('/tags?limit=0&sort=name')
      return {
        entries: data.docs.map(toEntry),
        cacheHint: { tags: ['tags'] },
      }
    } catch (error) {
      pinoLogger.error({ err: error }, 'failed to load tags collection')
      return {
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  },
  async loadEntry({ filter }) {
    try {
      const data = await fetchTags(
        `/tags?where[slug][equals]=${encodeURIComponent(filter.id)}&limit=1`,
      )
      const tag = data.docs[0]
      if (!tag) {
        // Astro turns this `undefined` into a LiveEntryNotFoundError, which
        // the tag page maps to a real 404 rather than an empty listing.
        pinoLogger.trace({ id: filter.id }, 'tag entry not found')
        return undefined
      }
      return toEntry(tag)
    } catch (error) {
      pinoLogger.error(
        { err: error, id: filter.id },
        'failed to load tag entry',
      )
      return {
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  },
}
