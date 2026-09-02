//@ts-check
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { withPayload } from '@payloadcms/next/withPayload'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // The workspace root's npm/pnpm lockfile setup is ambiguous, which makes
  // Next's auto-detected monorepo root unreliable - pin it explicitly.
  outputFileTracingRoot: path.join(dirname, '../../..'),
  // npm's hoisting installs a second, separate copy of @payloadcms/ui under
  // @payloadcms/plugin-cloud-storage's own node_modules (a transitive dep of
  // @payloadcms/storage-gcs) rather than reusing this project's copy. Two
  // physically distinct copies means two distinct React Context objects, so
  // a provider from one can't satisfy a hook from the other (e.g.
  // "useUploadHandlers must be used within UploadHandlersProvider"). Alias
  // every @payloadcms/ui import to this project's single canonical copy.
  turbopack: {
    resolveAlias: {
      '@payloadcms/ui': './node_modules/@payloadcms/ui',
    },
  },
}

export default withPayload(nextConfig)
