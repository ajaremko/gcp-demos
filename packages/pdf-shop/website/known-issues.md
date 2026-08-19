# Known Issues

## Stripe PaymentElement MutationObserver error (dev only)

**Error:**

```
Uncaught TypeError: Failed to execute 'observe' on 'MutationObserver': parameter 1 is not of type 'Node'
```

**Where:** Purchase page (`/purchase`), in the browser console, during local development only (`nx dev`). Does not occur in production builds (`nx build` / `next start`).

**Root cause:** `next.config.js` doesn't set `reactStrictMode`. Next.js 16.1.7 defaults the App Router tree to StrictMode-enabled when that option is unset (confirmed directly in `node_modules/next/dist/build/define-env.js`: `__NEXT_STRICT_MODE_APP` resolves to `true` when the config value is `null`/unset). In development, StrictMode double-invokes every component's mount effects as a bug-detection aid. This races against a well-documented upstream timing issue in `@stripe/react-stripe-js`, whose internal `Elements`/`PaymentElement` mount effect sets up a `MutationObserver` on its container — the synthetic double-invoke trips an internal assumption in Stripe's library and throws this error.

This is a known, dev-only artifact of the Stripe.js + React StrictMode interaction. It does not affect production behavior or actual payment functionality — investigated and ruled out every application-level cause first (single `<Elements>`/`<PaymentElement>` mount site in `src/app/purchase/CompletePaymentForm.tsx`, a correctly memoized module-singleton `stripePromise`, no conditional rendering or key churn around the Stripe components).

**Decision:** Leave as-is. Not worth trading away StrictMode's double-invoke effect-cleanup checks app-wide to silence a cosmetic dev-console error.

**If this ever needs to be fixed:** add `reactStrictMode: false` to `next.config.js`. One-line change, directly eliminates the double-invoke race. Confirmed this actually disables StrictMode for the App Router tree in the installed Next version (not just the Pages Router) — same `define-env.js` check resolves `__NEXT_STRICT_MODE_APP` to `false` when the config value is explicitly set to `false`.

## `PRETTY_PRINT_LOGS` misconfiguration isn't logged via pino

**Error:** An invalid `PRETTY_PRINT_LOGS` value (anything other than `"true"`/`"false"`) crashes with a plain uncaught exception, not a `fatal`-level pino log line like the other config-crash cases (`PDF_SHOP_DATA_DIR`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`).

**Where:** `resolvePrettyPrintLogs()` (`src/lib/prettyPrintLogs.ts`), called from `src/lib/pino.ts`.

**Root cause:** It's validated while `pinoLogger` itself is still being constructed — `resolvePrettyPrintLogs()` is called as an argument inside `pino.ts`'s own `pino({...})` call, so there's no logger instance yet at the point it throws.

**Decision:** Leave as-is. The uncaught exception already names the bad value clearly; a workaround (a temporary bootstrap logger constructed before validation) would add complexity for a startup-only, immediately-visible failure.

**If this ever needs to be fixed:** Validate `PRETTY_PRINT_LOGS` (and construct a minimal fallback logger to log the failure with) before constructing `pinoLogger` proper.

## The Docker image crashes if `PRETTY_PRINT_LOGS=true` (or `NODE_ENV` isn't `production`)

**Error:**

```
Error: unable to determine transport target for "pino-pretty"
```

**Where:** Startup, inside the built Docker image specifically (confirmed by running `dist/main.js` in a directory with no reachable `node_modules`, matching what the container actually provides).

**Root cause:** `webpack.config.js` sets `externalDependencies: 'none'` so `nx build` produces a fully self-contained `dist/main.js` (required — see the Dockerfile's own comment for why). That bundles `pino` itself, but `pino-pretty` is a `devDependency`, never bundled or installed in the image. pino loads its `pino-pretty` transport dynamically at runtime (not a static `require` webpack can bundle), so if `resolvePrettyPrintLogs()` ever resolves to `true` inside the container, pino tries to load a module that genuinely isn't there and crashes immediately. Outside the image (`nx serve`, or `node dist/main.js` run somewhere with a real `node_modules` alongside it), this doesn't happen — `pino-pretty` is actually installed and resolvable there.

The Dockerfile sets `ENV NODE_ENV=production`, which makes `resolvePrettyPrintLogs()` default to `false` — so this doesn't happen in normal use. It only bites if something overrides that: `docker run -e NODE_ENV=development ...`, or explicitly `-e PRETTY_PRINT_LOGS=true`.

**Decision:** Leave as-is. Pretty-printed logs were never meant for a production container regardless (see `RUNBOOK.md`'s "Logging" section) — this just means an attempt to force them here fails loudly instead of silently doing nothing.

**If this ever needs to be fixed:** Bundle `pino-pretty` as a real (non-dev) dependency so it's included in the self-contained build too, accepting the extra bundle size purely for this dynamic-load path to resolve. Not worth it today for a code path the image is never meant to use.
