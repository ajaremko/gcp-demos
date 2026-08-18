# Known Issues

## Postman VS Code extension fails to import the collection directly

**Error:**

```
Could not import collection. Please try again.
```

**Where:** Importing `.postman/pdf-shop-worker.postman_collection.json` directly via the Postman VS Code extension's own import flow.

**Root cause:** Unconfirmed. The file was checked against the official Postman Collection v2.1 JSON Schema (fetched live from `schema.getpostman.com`) and found fully valid — no formal violation. Structural changes made on the theory that the extension's importer is stricter than the bare schema (switching `url` from a decomposed `host`/`path` object to a plain string, adding `_postman_id`, adding `type: "text"` on the header) did not resolve it.

Likely an extension-specific quirk in the local-file import path itself rather than anything about the collection's content, given the identical file imports cleanly in the Postman desktop app.

**Workaround:** Open the collection file in the Postman **desktop** app first (File → Import, or drag the file in) — it imports and the request works immediately there. Returning to the VS Code extension afterward, the collection appears already loaded into the workspace (both apparently share the same signed-in Postman account/workspace sync) and works correctly from inside VS Code too, without ever needing to use the extension's own import dialog on the raw file again.

**If this ever needs to be fixed:** Next time it's attempted directly in the VS Code extension, check VS Code's Output panel (Postman extension's log channel) and the Developer Tools console for a more specific underlying error — neither was captured this time, only the generic toast. Also worth re-testing on a newer version of the extension in case this is a fixed bug.

## `PRETTY_PRINT_LOGS`/`LOG_LEVEL` misconfiguration isn't logged via pino

**Error:** An invalid `PRETTY_PRINT_LOGS` value (anything other than `"true"`/`"false"`) or an invalid `LOG_LEVEL` value (not a real pino level) crashes the process at startup with a plain uncaught exception in stderr, not a `fatal`-level pino log line like other config-crash cases (e.g. `PDF_SHOP_DATA_DIR` unset in production).

**Where:** `resolvePrettyPrintLogs()` and pino's own internal level validation, both in `src/main.ts`.

**Root cause:** Both are validated while `pinoLogger` itself is still being constructed — `resolvePrettyPrintLogs()` is called as an argument inside the `pino({...})` constructor call, and `LOG_LEVEL`'s validation happens inside pino's own constructor. There's no logger instance yet at either point.

**Decision:** Leave as-is. The uncaught exception already surfaces the problem clearly (env var name and the exact bad value, in `PRETTY_PRINT_LOGS`'s case) in stderr/process exit; a workaround (a temporary bootstrap logger constructed before validation) would add real complexity for a startup-only, immediately-visible failure mode.

**If this ever needs to be fixed:** Construct a minimal fallback logger (or use `console.error`) before calling `resolvePrettyPrintLogs()`/`pino(...)`.
