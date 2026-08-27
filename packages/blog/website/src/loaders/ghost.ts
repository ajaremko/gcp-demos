import { z } from 'astro/zod';
import type { LiveLoader } from 'astro/loaders';

export const blogPostSchema = z.object({
	title: z.string(),
	description: z.string(),
	pubDate: z.coerce.date(),
	updatedDate: z.coerce.date().optional(),
	heroImage: z.string().url().optional(),
});

export type BlogPostData = z.infer<typeof blogPostSchema>;

interface GhostPost {
	slug: string;
	title: string;
	excerpt: string | null;
	custom_excerpt: string | null;
	feature_image: string | null;
	published_at: string;
	updated_at: string;
	html: string;
}

interface GhostPostsResponse {
	posts: GhostPost[];
	errors?: Array<{ message: string }>;
}

function getGhostConfig() {
	// process.env, not import.meta.env: this must read the real container
	// environment at request time (Cloud Run injects GHOST_ADMIN_URL/
	// GHOST_CONTENT_KEY as runtime env vars). import.meta.env is statically
	// inlined by Vite at `astro build` time, which happens before the
	// Docker image (and its runtime env) even exists.
	const url = process.env.GHOST_ADMIN_URL;
	const key = process.env.GHOST_CONTENT_KEY;
	if (!url || !key) {
		throw new Error(
			'GHOST_ADMIN_URL and GHOST_CONTENT_KEY must be set to fetch blog content from Ghost.',
		);
	}
	return { url: url.replace(/\/+$/, ''), key };
}

async function fetchGhost(
	path: string,
	{ treat404AsEmpty = false }: { treat404AsEmpty?: boolean } = {},
): Promise<GhostPostsResponse> {
	const { url, key } = getGhostConfig();
	const separator = path.includes('?') ? '&' : '?';
	const response = await fetch(`${url}/ghost/api/content${path}${separator}key=${key}`);
	if (response.status === 404 && treat404AsEmpty) {
		// Ghost genuinely has no matching post - not a failure, don't treat it as one
		// (a real Ghost outage/network error never gets this far to produce a clean 404).
		return { posts: [] };
	}
	if (!response.ok) {
		throw new Error(`Ghost Content API request failed: ${response.status} ${response.statusText}`);
	}
	const data = (await response.json()) as GhostPostsResponse;
	if (data.errors?.length) {
		throw new Error(data.errors.map((e) => e.message).join('; '));
	}
	return data;
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
	};
}

export const ghostLoader: LiveLoader<BlogPostData> = {
	name: 'ghost-content-loader',
	async loadCollection() {
		try {
			const data = await fetchGhost('/posts/?limit=all');
			return {
				entries: data.posts.map(toEntry),
				cacheHint: { tags: ['ghost:posts'] },
			};
		} catch (error) {
			return { error: error instanceof Error ? error : new Error(String(error)) };
		}
	},
	async loadEntry({ filter }) {
		try {
			const data = await fetchGhost(`/posts/slug/${filter.id}/`, { treat404AsEmpty: true });
			const post = data.posts[0];
			if (!post) return undefined;
			return toEntry(post);
		} catch (error) {
			return { error: error instanceof Error ? error : new Error(String(error)) };
		}
	},
};
