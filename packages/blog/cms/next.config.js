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
}

export default withPayload(nextConfig)
