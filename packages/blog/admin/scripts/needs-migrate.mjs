// Decides whether the container's startup script has to pay for a
// `payload migrate` at all.
//
// Why this exists: `payload migrate` is a full Node + Payload boot - it loads
// the config, imports sharp/libvips and the lexical editor, builds the drizzle
// schema for every collection and opens SQLite, all before it can look at the
// migrations table and (almost always) discover there is nothing to apply.
// That runs on every cold start, and with `minInstanceCount: 0` in
// packages/blog/infra/src/service.ts every scale-to-zero cycle pays it. Reading
// the migrations table directly costs a bare Node boot instead.
//
// `node:sqlite` rather than the adapter's own libsql client: this must not
// import anything from the Payload graph, or it reintroduces the cost it
// exists to avoid. The replica restored by litestream is a plain SQLite file,
// so the built-in reader is enough.
//
// EVERY uncertain path deliberately reports "migrate" rather than "skip".
// Skipping a migration that was actually pending would corrupt the deployment
// silently; running one that was already applied just costs the seconds this
// script was trying to save. That asymmetry is the whole design - do not
// "tidy" a branch here into failing closed.

import { readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)

// Exit codes are consumed by an `if` in the startup script, so they read as a
// question rather than as success/failure: 0 = "yes, run migrate".
const MIGRATE = 0
const SKIP = 1

const dirname = path.dirname(fileURLToPath(import.meta.url))
// Beside dist/, not inside it - scripts/build-config.mjs does rmSync(outDir)
// on every build, so this file cannot live in its output.
const migrationDir = path.resolve(dirname, '../dist/migrations')

/** Compare names with the extension stripped, so a row stored as either
 * `20260828_233530_initial` or `...initial.js` matches the built file. */
function normalize(name) {
  return name.replace(/\.(js|ts)$/, '')
}

function decide() {
  const dbPath = process.env.DB_PATH
  if (!dbPath) {
    return [MIGRATE, 'DB_PATH is not set']
  }

  // The same filter scripts/build-config.mjs applies when it emits these:
  // payload's readMigrationFiles() skips the index barrel itself.
  const built = readdirSync(migrationDir)
    .filter((file) => file.endsWith('.js') && file !== 'index.js')
    .map(normalize)

  if (built.length === 0) {
    // Nothing was built, which means the image is wrong rather than that
    // there is nothing to do. Let payload be the one to complain.
    return [MIGRATE, 'no built migrations found']
  }

  // Imported lazily so a Node build without the SQLite module falls into the
  // catch below and migrates, instead of failing the script at parse time.
  const { DatabaseSync } = require('node:sqlite')

  // `open: false` then `.open()` would let a missing file be distinguished
  // from a corrupt one, but both answers are "migrate", so don't bother.
  const db = new DatabaseSync(dbPath, { readOnly: true })
  try {
    // Confirm the shape before trusting it: an older or future payload could
    // name this column something else, and a wrong guess must not read as
    // "every migration is applied".
    const columns = db
      .prepare(`PRAGMA table_info(payload_migrations)`)
      .all()
      .map((column) => column.name)

    if (columns.length === 0) {
      return [MIGRATE, 'payload_migrations table does not exist']
    }
    if (!columns.includes('name')) {
      return [MIGRATE, 'payload_migrations has no "name" column']
    }

    const applied = new Set(
      db
        .prepare(`SELECT name FROM payload_migrations`)
        .all()
        .map((row) => normalize(String(row.name))),
    )

    const pending = built.filter((name) => !applied.has(name))
    return pending.length > 0
      ? [MIGRATE, `pending: ${pending.join(', ')}`]
      : [SKIP, `all ${built.length} migration(s) already applied`]
  } finally {
    db.close()
  }
}

let code
let reason
try {
  ;[code, reason] = decide()
} catch (error) {
  code = MIGRATE
  reason = `check failed (${error.message})`
}

console.log(
  `[needs-migrate] ${code === MIGRATE ? 'migrate' : 'skip'}: ${reason}`,
)
process.exit(code)
