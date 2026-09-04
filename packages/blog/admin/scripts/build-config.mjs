// Compiles payload.config.ts and the migrations to plain ESM JavaScript in
// dist/, so the container can run `payload migrate --disable-transpile`.
//
// Why this exists: payload's CLI (node_modules/payload/bin.js) otherwise
// loads the config through `tsx/esm/api`, and deliberately clears
// `module.registerHooks` to force tsx's *async worker-thread* path - so
// every module resolution in the process round-trips to a worker while it
// transpiles the config, all four collections, the logging helpers and
// every migration file. Measured on Cloud Run, that made `npx payload
// migrate` take 11-23s (median ~14s) of a ~19s cold start, on every single
// start, while applying nothing. Pointing the CLI at prebuilt JS skips the
// transpile entirely.
//
// esbuild with `bundle: true` rather than tsc: the source uses
// extensionless relative imports (`./collections/Posts`), which tsc emits
// verbatim and Node's ESM resolver then rejects. Bundling resolves those
// internally, so there is nothing left to resolve at runtime.
//
// Migrations are built as separate entry points on purpose - payload's
// readMigrationFiles() reads migrationDir and imports each file
// individually, so they cannot be folded into one bundle.

import { build } from 'esbuild'
import { readdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(dirname, '..')
const srcDir = path.join(root, 'src')
const outDir = path.join(root, 'dist')

// index.ts is the barrel payload's readMigrationFiles() explicitly skips
// (it filters out index.js/index.ts), so building it would be dead weight.
const migrationEntries = readdirSync(path.join(srcDir, 'migrations'))
  .filter((file) => file.endsWith('.ts') && file !== 'index.ts')
  .map((file) => path.join(srcDir, 'migrations', file))

// Cleared rather than written over: the whole directory is copied into the
// image, and payload rebases its own dirname-relative output paths here
// when it loads the compiled config - `typescript.outputFile` otherwise
// drops a stray payload-types.ts in among the shipped artifacts.
rmSync(outDir, { recursive: true, force: true })

/** @type {import('esbuild').BuildOptions} */
const shared = {
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  // Everything under node_modules stays external - this bundle exists to
  // erase TypeScript and relative imports, not to vendor dependencies.
  packages: 'external',
  logLevel: 'info',
}

await build({
  ...shared,
  entryPoints: [path.join(srcDir, 'payload.config.ts')],
  outfile: path.join(outDir, 'payload.config.js'),
})

await build({
  ...shared,
  entryPoints: migrationEntries,
  outdir: path.join(outDir, 'migrations'),
})

console.log(
  `[build-config] wrote dist/payload.config.js and ${migrationEntries.length} migration(s)`,
)
