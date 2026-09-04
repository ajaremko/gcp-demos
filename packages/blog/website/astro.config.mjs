// @ts-check

import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import { defineConfig, memoryCache } from 'astro/config'

import node from '@astrojs/node'

import icon from 'astro-icon'

// https://astro.build/config
export default defineConfig({
  site: 'https://example.com',
  integrations: [
    mdx(),
    sitemap(),
    icon({
      include: {
        'simple-icons': [
          'github',
          'linkedin',
          'astro',
          'typescript',
          'nextdotjs',
          'react',
          'payloadcms',
          'sqlite',
          'nodedotjs',
          'docker',
          'nginx',
          'googlecloud',
          'pulumi',
        ],
        mdi: ['email-outline'],
      },
    }),
  ],

  // '/' is now the post listing itself (matching the redesign's IA) -
  // keep the old '/blog' URL working as a redirect rather than a 404.
  // Individual posts moved from '/blog/<slug>' to '/posts/<slug>' -
  // preserve those links too rather than 404ing existing bookmarks.
  redirects: {
    '/blog': '/',
    '/blog/[...slug]': '/posts/[...slug]',
  },

  vite: {
    // In production the website and blog-admin sit behind one nginx gateway
    // on a single origin, so the root-relative media URLs the admin API
    // returns ("/api/media/file/<filename>") resolve straight from the
    // browser. Dev has no such gateway - astro is on 4321, blog-admin on
    // 4000 - so proxy /api to reproduce that same-origin topology rather
    // than absolutising URLs in the loader.
    //
    // Applies to `astro dev` only: under `astro preview`, or a locally run
    // production build, there is no proxy and media requests 404.
    server: {
      proxy: {
        '/api': 'http://localhost:4000',
      },
    },
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
    '/tags': { maxAge: 300, swr: 60 },
    '/tags/[tagSlug]': { maxAge: 300, swr: 60 },
  },

  adapter: node({
    mode: 'standalone',
  }),
})
