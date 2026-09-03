// @ts-check

import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import { defineConfig, memoryCache } from 'astro/config'

import node from '@astrojs/node'

// https://astro.build/config
export default defineConfig({
  site: 'https://example.com',
  integrations: [mdx(), sitemap()],

  // '/' is now the post listing itself (matching the redesign's IA) -
  // keep the old '/blog' URL working as a redirect rather than a 404.
  // Individual posts moved from '/blog/<slug>' to '/posts/<slug>' -
  // preserve those links too rather than 404ing existing bookmarks.
  redirects: {
    '/blog': '/',
    '/blog/[...slug]': '/posts/[...slug]',
  },

  vite: {
    ssr: {
      noExternal: ['cookie'],
    },
    environments: {
      prerender: {
        resolve: {
          noExternal: ['cookie'],
        },
      },
      ssr: {
        resolve: {
          noExternal: ['cookie'],
        },
      },
    },
  },

  cache: {
    provider: memoryCache(),
  },

  routeRules: {
    // '/' is now the post listing (was '/blog' before the redesign) -
    // '/blog' itself is just a redirect to '/', not worth caching.
    '/': { maxAge: 300, swr: 60 },
    '/posts/[...slug]': { maxAge: 300, swr: 60 },
  },

  adapter: node({
    mode: 'standalone',
  }),
})
