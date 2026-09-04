import nextEnv from '@next/env'
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'

// Running this script directly via `tsx` (unlike `npx payload <command>`,
// which loads .env itself before anything else) never loads .env at all -
// so payload.config.ts's own env-var guards (PAYLOAD_SECRET, DB_PATH,
// GCS_MEDIA_BUCKET) would always see an empty environment. Load .env the
// same way Payload's own CLI does (payload/dist/bin/loadEnv.js) before
// importing the config - the import has to be dynamic, since a static
// `import config from '../payload.config'` would be hoisted and evaluated
// before this call ever runs.
const { loadEnvConfig } = nextEnv

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production')

const { default: config } = await import('../payload.config')

// Local dev/demo seeding only - fixed on purpose so a fresh run always
// prints working credentials rather than generating a throwaway password.
const ADMIN_EMAIL = 'admin@example.com'
const ADMIN_PASSWORD = 'password'

const POST_COUNT = 20

// Fixed rather than generated so a re-run assigns the same tags to the same
// posts, and so the slugs are stable enough to hardcode in a /tag/<slug>
// smoke test.
const TAGS = [
  { name: 'Astro', slug: 'astro' },
  { name: 'Payload CMS', slug: 'payload-cms' },
  { name: 'Google Cloud', slug: 'google-cloud' },
  { name: 'TypeScript', slug: 'typescript' },
  { name: 'SQLite', slug: 'sqlite' },
  { name: 'Infrastructure', slug: 'infrastructure' },
]

const LOREM_WORDS = [
  'lorem',
  'ipsum',
  'dolor',
  'sit',
  'amet',
  'consectetur',
  'adipiscing',
  'elit',
  'sed',
  'eiusmod',
  'tempor',
  'incididunt',
  'labore',
  'dolore',
  'magna',
  'aliqua',
  'enim',
  'minim',
  'veniam',
  'quis',
  'nostrud',
  'exercitation',
  'ullamco',
  'laboris',
  'nisi',
  'aliquip',
  'commodo',
  'consequat',
  'duis',
  'aute',
  'irure',
  'voluptate',
]

const LOREM_SENTENCES = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  'Curabitur pretium tincidunt lacus, ut interdum tellus elementum sagittis vitae.',
  'Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.',
  'Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante.',
  'Donec eu libero sit amet quam egestas semper.',
  'Aenean ultricies mi vitae est mauris placerat eleifend leo.',
  'Fusce commodo aliquam arcu.',
  'Nam commodo suscipit quam.',
  'In consectetuer turpis ut velit.',
  'Nullam nulla eros, ultricies sit amet, nonummy id, imperdiet feugiat, pede.',
]

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function titleCase(word: string): string {
  return word[0].toUpperCase() + word.slice(1)
}

function randomTitle(): string {
  const wordCount = 4 + Math.floor(Math.random() * 3)
  const words = Array.from({ length: wordCount }, () => randomItem(LOREM_WORDS))
  return words.map(titleCase).join(' ')
}

function randomExcerpt(): string {
  return randomItem(LOREM_SENTENCES)
}

function textNode(text: string) {
  return {
    type: 'text',
    version: 1,
    detail: 0,
    format: 0,
    mode: 'normal',
    style: '',
    text,
  }
}

function paragraphNode(text: string) {
  return {
    type: 'paragraph',
    version: 1,
    children: [textNode(text)],
    direction: 'ltr',
    format: '',
    indent: 0,
    textFormat: 0,
    textStyle: '',
  }
}

// Minimal, hand-built Lexical document (root -> paragraphs -> text) rather
// than an HTML->Lexical conversion utility - @payloadcms/richtext-lexical
// has one internally, but it isn't part of the package's published exports,
// so it isn't something to depend on here.
function randomLexicalContent() {
  const paragraphCount = 3 + Math.floor(Math.random() * 3)
  const paragraphs = Array.from({ length: paragraphCount }, () => {
    const sentenceCount = 2 + Math.floor(Math.random() * 3)
    const sentences = Array.from({ length: sentenceCount }, () =>
      randomItem(LOREM_SENTENCES),
    )
    return sentences.join(' ')
  })

  return {
    root: {
      type: 'root',
      children: paragraphs.map(paragraphNode),
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

function hslToRgb(
  h: number,
  s: number,
  l: number,
): { r: number; g: number; b: number } {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return {
    r: Math.round(255 * f(0)),
    g: Math.round(255 * f(8)),
    b: Math.round(255 * f(4)),
  }
}

// Solid-color JPEG generated in-memory via sharp (already a project
// dependency) - no network fetch, no checked-in image asset.
async function generateHeroImage(index: number): Promise<Buffer> {
  const hue = (index * 37) % 360
  const { r, g, b } = hslToRgb(hue, 65, 55)

  return sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 3,
      background: { r, g, b },
    },
  })
    .jpeg()
    .toBuffer()
}

async function ensureAdmin(payload: Payload): Promise<void> {
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: ADMIN_EMAIL } },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    console.log(`[seed] admin user "${ADMIN_EMAIL}" already exists, skipping`)
  } else {
    await payload.create({
      collection: 'users',
      data: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      },
    })
    console.log(`[seed] created admin user "${ADMIN_EMAIL}"`)
  }

  console.log(`[seed] admin credentials: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
}

async function ensureTags(payload: Payload): Promise<number[]> {
  const ids: number[] = []

  for (const tag of TAGS) {
    const existing = await payload.find({
      collection: 'tags',
      where: { slug: { equals: tag.slug } },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      console.log(`[seed] tag "${tag.slug}" already exists, skipping`)
      ids.push(existing.docs[0].id as number)
      continue
    }

    const created = await payload.create({ collection: 'tags', data: tag })
    console.log(`[seed] created tag "${tag.slug}"`)
    ids.push(created.id as number)
  }

  return ids
}

// Deterministic rather than random so every post keeps the same tags across
// runs: post N gets 1-3 tags starting at position N in the list, wrapping.
function tagsForPost(tagIds: number[], index: number): number[] {
  const count = 1 + (index % 3)
  return Array.from(
    { length: count },
    (_, offset) => tagIds[(index + offset) % tagIds.length],
  )
}

async function ensurePost(
  payload: Payload,
  index: number,
  tagIds: number[],
): Promise<void> {
  const slug = `lorem-ipsum-post-${index}`

  const existing = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    console.log(`[seed] post "${slug}" already exists, skipping`)
    return
  }

  const title = randomTitle()
  const imageBuffer = await generateHeroImage(index)

  const media = await payload.create({
    collection: 'media',
    data: { alt: `Hero image for ${title}` },
    file: {
      data: imageBuffer,
      mimetype: 'image/jpeg',
      name: `hero-${index}.jpg`,
      size: imageBuffer.length,
    },
  })

  const publishedDate = new Date()
  publishedDate.setDate(publishedDate.getDate() - index)

  await payload.create({
    collection: 'posts',
    data: {
      title,
      slug,
      excerpt: randomExcerpt(),
      heroImage: media.id,
      content: randomLexicalContent() as any,
      publishedDate: publishedDate.toISOString(),
      tags: tagsForPost(tagIds, index),
      _status: 'published',
    },
  })

  console.log(`[seed] created post "${slug}"`)
}

async function run(): Promise<void> {
  const payload = await getPayload({ config })

  await ensureAdmin(payload)

  const tagIds = await ensureTags(payload)

  for (let i = 1; i <= POST_COUNT; i++) {
    await ensurePost(payload, i, tagIds)
  }

  console.log('[seed] done')
  process.exit(0)
}

run().catch((err) => {
  console.error('[seed] failed', err)
  process.exit(1)
})
