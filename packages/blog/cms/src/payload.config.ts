import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { gcsStorage } from '@payloadcms/storage-gcs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Media } from './collections/Media'
import { Posts } from './collections/Posts'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

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
  collections: [Users, Media, Posts],
  db: sqliteAdapter({
    client: {
      url: `file:${process.env.DB_PATH}`,
    },
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  editor: lexicalEditor(),
  plugins: [
    // Only enabled when GCS_MEDIA_BUCKET is actually set (e.g. plain local
    // dev without the full multicontainer/GCS setup) - falls back to local
    // disk storage otherwise.
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
  // SharpDependency type across versions - a benign type-level mismatch, not
  // a runtime one.
  sharp: sharp as unknown as Parameters<typeof buildConfig>[0]['sharp'],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
