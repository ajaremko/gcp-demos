//@ts-check
const path = require('node:path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    styledComponents: true,
  },
  output: 'standalone',
  // The workspace root's npm/pnpm lockfile setup is ambiguous, which makes
  // Next's auto-detected monorepo root unreliable — pin it explicitly.
  outputFileTracingRoot: path.join(__dirname, '../../..'),
}

module.exports = nextConfig
