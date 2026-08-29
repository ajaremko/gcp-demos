export const prerender = false

import { getLiveCollection } from 'astro:content'
import rss from '@astrojs/rss'
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts'
import { pinoLogger } from '../logging/pino'

export async function GET(context) {
  const { entries, error } = await getLiveCollection('blog')
  if (error) {
    pinoLogger.error({ err: error }, 'Failed to load posts from the CMS')
    return new Response('Failed to load feed', { status: 502 })
  }
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: (entries ?? []).map((post) => ({
      ...post.data,
      link: `/blog/${post.id}/`,
    })),
  })
}
