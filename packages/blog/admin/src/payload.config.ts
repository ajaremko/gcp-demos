import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { gcsStorage } from '@payloadcms/storage-gcs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Media } from './collections/Media'
import { Posts } from './collections/Posts'
import { Tags } from './collections/Tags'
import { Users } from './collections/Users'
import { pinoLogger } from './logging/pino'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// `next build` imports this module during its static-analysis pass (via
// withPayload()) to learn collection slugs, admin routes, etc. - the real
// runtime env vars below are never available then, only at actual startup
// (next start / payload migrate / the running server). NEXT_PHASE is set by
// Next itself specifically to distinguish that build-time import from a
// real run, so skip the guards only there.
//
// PHASE_PRODUCTION_BUILD's value, hardcoded rather than imported from
// next/constants - in production this file is loaded directly (via
// PAYLOAD_CONFIG_PATH) by the payload CLI's raw-TS-source loader, where
// `next/constants` resolves to the *traced* copy of `next` that Next's own
// standalone output ships (only what Next's own compiled code needs
// internally), which doesn't include this subpath at all.
const PHASE_PRODUCTION_BUILD = 'phase-production-build'

const isBuildPhase = process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD

if (!isBuildPhase) {
  if (process.env.NODE_ENV !== 'development' && !process.env.GCS_MEDIA_BUCKET) {
    pinoLogger.fatal('GCS_MEDIA_BUCKET environment variable is not set')
    throw new Error('GCS_MEDIA_BUCKET environment variable is not set')
  }

  if (!process.env.PAYLOAD_SECRET) {
    pinoLogger.fatal('PAYLOAD_SECRET environment variable is not set')
    throw new Error('PAYLOAD_SECRET environment variable is not set')
  }

  if (!process.env.DB_PATH) {
    pinoLogger.fatal('DB_PATH environment variable is not set')
    throw new Error('DB_PATH environment variable is not set')
  }
}

const payloadLogger = pinoLogger.child({ module: 'payload' })

export default buildConfig({
  admin: {
    user: Users.slug,
    // The (payload) route group is flattened away in this project (routes
    // live directly under src/app/admin), which isn't the location
    // `payload generate:importmap` assumes by default - point it at where
    // the admin route actually imports the map from.
    importMap: {
      importMapFile: path.resolve(dirname, 'app/admin/importMap.js'),
    },
  },
  collections: [Users, Media, Posts, Tags],
  db: sqliteAdapter({
    client: {
      url: `file:${process.env.DB_PATH}`,
    },
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  editor: lexicalEditor(),
  logger: payloadLogger,
  plugins: [
    gcsStorage({
      enabled: Boolean(process.env.GCS_MEDIA_BUCKET),
      bucket: process.env.GCS_MEDIA_BUCKET || '',
      collections: {
        media: true,
      },
      options: {},
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || '',
  // sharp's own types don't perfectly structurally match Payload's simplified
  // SharpDependency type across versions
  sharp: sharp as unknown as Parameters<typeof buildConfig>[0]['sharp'],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
