// @ts-check

import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import { defineConfig, fontProviders } from 'astro/config'

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://example.com',
  integrations: [mdx(), sitemap()],

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
    provider: {
      entrypoint: './src/cache/filesystem-provider.ts',
    },
  },

  routeRules: {
    '/blog': { maxAge: 300, swr: 60 },
    '/blog/[...slug]': { maxAge: 300, swr: 60 },
  },

  fonts: [
    {
      provider: fontProviders.google(),
      name: 'DM Serif Display',
      cssVariable: '--font-dm-serif-display',
      fallbacks: ['serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Outfit',
      cssVariable: '--font-outfit',
      weights: [400, 700],
      fallbacks: ['sans-serif'],
    },
  ],

  adapter: node({
    mode: 'standalone',
  }),
})