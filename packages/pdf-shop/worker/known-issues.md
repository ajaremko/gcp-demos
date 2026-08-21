# Known Issues

## Postman VS Code extension fails to import the collection directly

**Error:**

```
Could not import collection. Please try again.
```

**Where:** Importing `.postman/pdf-shop-worker.postman_collection.json` directly via the Postman VS Code extension's own import flow.

**Root cause:** Unconfirmed. The file was checked against the official Postman Collection v2.1 JSON Schema (fetched live from `schema.getpostman.com`) and found fully valid - no formal violation. Structural changes made on the theory that the extension's importer is stricter than the bare schema (switching `url` from a decomposed `host`/`path` object to a plain string, adding `_postman_id`, adding `type: "text"` on the header) did not resolve it.

Likely an extension-specific quirk in the local-file import path itself rather than anything about the collection's content, given the identical file imports cleanly in the Postman desktop app.

**Workaround:** Open the collection file in the Postman **desktop** app first (File → Import, or drag the file in) - it imports and the request works immediately there. Returning to the VS Code extension afterward, the collection appears already loaded into the workspace (both apparently share the same signed-in Postman account/workspace sync) and works correctly from inside VS Code too, without ever needing to use the extension's own import dialog on the raw file again.

**If this ever needs to be fixed:** Next time it's attempted directly in the VS Code extension, check VS Code's Output panel (Postman extension's log channel) and the Developer Tools console for a more specific underlying error - neither was captured this time, only the generic toast. Also worth re-testing on a newer version of the extension in case this is a fixed bug.

## `PRETTY_PRINT_LOGS`/`LOG_LEVEL` misconfiguration isn't logged via pino

**Error:** An invalid `PRETTY_PRINT_LOGS` value (anything other than `"true"`/`"false"`) or an invalid `LOG_LEVEL` value (not a real pino level) crashes the process at startup with a plain uncaught exception in stderr, not a `fatal`-level pino log line like other config-crash cases (e.g. `PDF_SHOP_DATA_DIR` unset in production).

**Where:** `resolvePrettyPrintLogs()` and pino's own internal level validation, both in `src/main.ts`.

**Root cause:** Both are validated while `pinoLogger` itself is still being constructed - `resolvePrettyPrintLogs()` is called as an argument inside the `pino({...})` constructor call, and `LOG_LEVEL`'s validation happens inside pino's own constructor. There's no logger instance yet at either point.

**Decision:** Leave as-is. The uncaught exception already surfaces the problem clearly (env var name and the exact bad value, in `PRETTY_PRINT_LOGS`'s case) in stderr/process exit; a workaround (a temporary bootstrap logger constructed before validation) would add real complexity for a startup-only, immediately-visible failure mode.

**If this ever needs to be fixed:** Construct a minimal fallback logger (or use `console.error`) before calling `resolvePrettyPrintLogs()`/`pino(...)`.

## The Docker image crashes if `PRETTY_PRINT_LOGS=true` (or `NODE_ENV` isn't `production`)

**Error:**

```
Error: unable to determine transport target for "pino-pretty"
```

**Where:** Startup, inside the built Docker image specifically (confirmed by running `dist/main.js` in a directory with no reachable `node_modules`, matching what the container actually provides).

**Root cause:** `webpack.config.js` sets `externalDependencies: 'none'` so `nx build` produces a fully self-contained `dist/main.js` (required - see the Dockerfile's own comment for why). That bundles `pino` itself, but `pino-pretty` is a `devDependency`, never bundled or installed in the image. pino loads its `pino-pretty` transport dynamically at runtime (not a static `require` webpack can bundle), so if `resolvePrettyPrintLogs()` ever resolves to `true` inside the container, pino tries to load a module that genuinely isn't there and crashes immediately. Outside the image (`nx serve`, or `node dist/main.js` run somewhere with a real `node_modules` alongside it), this doesn't happen - `pino-pretty` is actually installed and resolvable there.

The Dockerfile sets `ENV NODE_ENV=production`, which makes `resolvePrettyPrintLogs()` default to `false` - so this doesn't happen in normal use. It only bites if something overrides that: `docker run -e NODE_ENV=development ...`, or explicitly `-e PRETTY_PRINT_LOGS=true`.

**Decision:** Leave as-is. Pretty-printed logs were never meant for a production container regardless (see `RUNBOOK.md`'s "Logging" section) - this just means an attempt to force them here fails loudly instead of silently doing nothing.

**If this ever needs to be fixed:** Bundle `pino-pretty` as a real (non-dev) dependency so it's included in the self-contained build too, accepting the extra bundle size purely for this dynamic-load path to resolve. Not worth it today for a code path the image is never meant to use.
