# Astro Starter Kit: Blog

```sh
npm create astro@latest -- --template blog
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

Features:

- ✅ Minimal styling (make it your own!)
- ✅ 100/100 Lighthouse performance
- ✅ SEO-friendly with canonical URLs and Open Graph data
- ✅ Sitemap support
- ✅ RSS Feed support
- ✅ Markdown & MDX support

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── content/
│   ├── layouts/
│   └── pages/
├── astro.config.mjs
├── README.md
├── package.json
└── tsconfig.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

The `src/content/` directory contains "collections" of related Markdown and MDX documents. Use `getCollection()` to retrieve posts from `src/content/blog/`, and type-check your frontmatter using an optional schema. See [Astro's Content Collections docs](https://docs.astro.build/en/guides/content-collections/) to learn more.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## Logging

Server-side logging goes through [pino](https://getpino.io/) (`src/logging/pino.ts`),
following the same pattern documented in `packages/pdf-shop/website/RUNBOOK.md`.

| Env var             | Type      | Purpose                                  | Default                                  |
| ------------------- | --------- | ---------------------------------------- | ---------------------------------------- |
| `LOG_LEVEL`         | `enum`    | Overrides the default pino level         | `info` in production, `trace` otherwise  |
| `PRETTY_PRINT_LOGS` | `boolean` | Whether logs are pretty-printed vs. JSON | `true` outside production, `false` in it |

pino's level is a threshold: whatever `LOG_LEVEL` is set to shows that level
and everything more severe.

| Level   | Events logged                                                                                                                                |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `trace` | Step-by-step execution: CMS API loader calls (`src/loaders/cms.ts`) and cache provider internals (`src/cache/inMemoryCacheProvider.ts`) |
| `debug` | Internally-handled failures in the cache provider (a failed persist/revalidation/invalidate that doesn't affect the response)                     |
| `warn`  | A non-ok response from the CMS's REST API (`/api/posts`)                                                                                          |
| `error` | Failure to load posts/a post from the CMS that surfaces to a visitor as a `502`                                                                   |
| `fatal` | Missing required configuration (`CMS_URL`)                                                                                                        |

`pino-pretty` is a devDependency only - the production Docker image excludes
devDependencies (`Dockerfile`'s `npm install --omit=dev`), so
`PRETTY_PRINT_LOGS` must never be forced to `true` there (the default
already handles this correctly by keying off `NODE_ENV`).
