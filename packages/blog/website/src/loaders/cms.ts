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

interface CmsMedia {
	url: string
}

interface CmsPost {
	slug: string
	title: string
	excerpt: string
	heroImage: CmsMedia | null
	publishedDate: string
	updatedAt: string
	contentHTML: string
}

interface CmsPostsResponse {
	docs: CmsPost[]
	errors?: Array<{ message: string }>
}

function getCmsUrl(): string {
	// process.env, not import.meta.env: this must read the real container
	// environment at request time (Cloud Run injects ADMIN_API_URL as a
	// runtime env var, pointing at the "cms" sidecar container over
	// loopback). import.meta.env is statically inlined by Vite at
	// `astro build` time, which happens before the Docker image (and its
	// runtime env) even exists.
	const url = process.env.ADMIN_API_URL
	if (!url) {
		pinoLogger.fatal('Missing required configuration: ADMIN_API_URL must be set to fetch blog content from the CMS')
		throw new Error('ADMIN_API_URL must be set to fetch blog content from the CMS.')
	}
	return url.replace(/\/+$/, '')
}

async function fetchCms(path: string): Promise<CmsPostsResponse> {
	const url = getCmsUrl()
	pinoLogger.trace({ path }, 'Fetching from CMS API')
	const response = await fetch(`${url}/api${path}`)
	if (!response.ok) {
		pinoLogger.warn(
			{ path, status: response.status, statusText: response.statusText },
			'CMS API request failed',
		)
		throw new Error(`CMS API request failed: ${response.status} ${response.statusText}`)
	}
	const data = (await response.json()) as CmsPostsResponse
	if (data.errors?.length) {
		pinoLogger.warn({ path, errors: data.errors }, 'CMS API returned errors')
		throw new Error(data.errors.map((e) => e.message).join('; '))
	}
	pinoLogger.trace({ path, postCount: data.docs.length }, 'CMS API request succeeded')
	return data
}

function toEntry(post: CmsPost) {
	return {
		id: post.slug,
		data: {
			title: post.title,
			description: post.excerpt,
			pubDate: post.publishedDate,
			updatedDate: post.updatedAt,
			heroImage: post.heroImage?.url ?? undefined,
		},
		rendered: { html: post.contentHTML },
		cacheHint: {
			tags: ['cms:posts', `cms:post:${post.slug}`],
			lastModified: new Date(post.updatedAt),
		},
	}
}

export const cmsLoader: LiveLoader<BlogPostData> = {
	name: 'cms-content-loader',
	async loadCollection() {
		pinoLogger.trace('loadCollection() called')
		try {
			const data = await fetchCms('/posts?where[_status][equals]=published&limit=0')
			pinoLogger.trace({ postCount: data.docs.length }, 'loadCollection() returning entries')
			return {
				entries: data.docs.map(toEntry),
				cacheHint: { tags: ['cms:posts'] },
			}
		} catch (error) {
			pinoLogger.error({ err: error }, 'loadCollection() failed to load posts from the CMS')
			return {
				error: error instanceof Error ? error : new Error(String(error)),
			}
		}
	},
	async loadEntry({ filter }) {
		pinoLogger.trace({ id: filter.id }, 'loadEntry() called')
		try {
			const data = await fetchCms(
				`/posts?where[slug][equals]=${encodeURIComponent(filter.id)}&where[_status][equals]=published&limit=1`,
			)
			const post = data.docs[0]
			if (!post) {
				pinoLogger.trace({ id: filter.id }, 'loadEntry() found no matching post')
				return undefined
			}
			pinoLogger.trace({ id: filter.id }, 'loadEntry() returning entry')
			return toEntry(post)
		} catch (error) {
			pinoLogger.error({ err: error, id: filter.id }, 'loadEntry() failed to load post from the CMS')
			return {
				error: error instanceof Error ? error : new Error(String(error)),
			}
		}
	},
}
