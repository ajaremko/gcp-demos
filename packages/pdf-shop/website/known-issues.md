# Known Issues

## Stripe PaymentElement MutationObserver error (dev only)

**Error:**

```
Uncaught TypeError: Failed to execute 'observe' on 'MutationObserver': parameter 1 is not of type 'Node'
```

**Where:** Purchase page (`/purchase`), in the browser console, during local development only (`nx dev`). Does not occur in production builds (`nx build` / `next start`).

**Root cause:** `next.config.js` doesn't set `reactStrictMode`. Next.js 16.1.7 defaults the App Router tree to StrictMode-enabled when that option is unset (confirmed directly in `node_modules/next/dist/build/define-env.js`: `__NEXT_STRICT_MODE_APP` resolves to `true` when the config value is `null`/unset). In development, StrictMode double-invokes every component's mount effects as a bug-detection aid. This races against a well-documented upstream timing issue in `@stripe/react-stripe-js`, whose internal `Elements`/`PaymentElement` mount effect sets up a `MutationObserver` on its container - the synthetic double-invoke trips an internal assumption in Stripe's library and throws this error.

This is a known, dev-only artifact of the Stripe.js + React StrictMode interaction. It does not affect production behavior or actual payment functionality - investigated and ruled out every application-level cause first (single `<Elements>`/`<PaymentElement>` mount site in `src/app/purchase/CompletePaymentForm.tsx`, a correctly memoized module-singleton `stripePromise`, no conditional rendering or key churn around the Stripe components).

**Decision:** Leave as-is. Not worth trading away StrictMode's double-invoke effect-cleanup checks app-wide to silence a cosmetic dev-console error.

**If this ever needs to be fixed:** add `reactStrictMode: false` to `next.config.js`. One-line change, directly eliminates the double-invoke race. Confirmed this actually disables StrictMode for the App Router tree in the installed Next version (not just the Pages Router) - same `define-env.js` check resolves `__NEXT_STRICT_MODE_APP` to `false` when the config value is explicitly set to `false`.

## `PRETTY_PRINT_LOGS` misconfiguration isn't logged via pino

**Error:** An invalid `PRETTY_PRINT_LOGS` value (anything other than `"true"`/`"false"`) crashes with a plain uncaught exception, not a `fatal`-level pino log line like the other config-crash cases (`PDF_SHOP_DATA_DIR`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`).

**Where:** `resolvePrettyPrintLogs()` (`src/lib/prettyPrintLogs.ts`), called from `src/lib/pino.ts`.

**Root cause:** It's validated while `pinoLogger` itself is still being constructed - `resolvePrettyPrintLogs()` is called as an argument inside `pino.ts`'s own `pino({...})` call, so there's no logger instance yet at the point it throws.

**Decision:** Leave as-is. The uncaught exception already names the bad value clearly; a workaround (a temporary bootstrap logger constructed before validation) would add complexity for a startup-only, immediately-visible failure.

**If this ever needs to be fixed:** Validate `PRETTY_PRINT_LOGS` (and construct a minimal fallback logger to log the failure with) before constructing `pinoLogger` proper.

## The Docker image crashes if `PRETTY_PRINT_LOGS=true` (or `NODE_ENV` isn't `production`)

**Error:**

```
Error: unable to determine transport target for "pino-pretty"
```

**Where:** Startup, inside the built Docker image specifically - confirmed by inspecting the actual image (`docker run --rm <image> ls .../node_modules`), which has no `pino-pretty` present, matching what the standalone container actually provides.

**Root cause:** `next.config.js` sets `output: 'standalone'`, and Next's standalone build only bundles/installs the _production_ dependencies actually needed to run - `pino-pretty` is a `devDependency`, so it's never installed there. pino loads its `pino-pretty` transport dynamically at runtime (not a static `require` the build can trace/bundle), so if `resolvePrettyPrintLogs()` ever resolves to `true` inside the container, pino tries to load a module that genuinely isn't there and crashes immediately. Outside the image (`nx dev`, or `node .next/standalone/.../server.js` run somewhere with a real `node_modules` alongside it), this doesn't happen - `pino-pretty` is actually installed and resolvable there.

The Dockerfile sets `ENV NODE_ENV=production`, and `.next/standalone/.../server.js` also unconditionally sets `process.env.NODE_ENV = 'production'` itself at startup - so `resolvePrettyPrintLogs()` defaults to `false` in normal use. It only bites if something overrides that: `docker run -e PRETTY_PRINT_LOGS=true ...`, or - a real incident, not just a hypothetical - the standalone build's own `.env`-copying behavior setting it implicitly; see the next entry.

**Decision:** Leave as-is. Pretty-printed logs were never meant for a production container regardless (see `RUNBOOK.md`'s "Logging" section) - this just means an attempt to force them here fails loudly instead of silently doing nothing.

**If this ever needs to be fixed:** Bundle `pino-pretty` as a real (non-dev) dependency so it's included in the standalone build too, accepting the extra bundle size purely for this dynamic-load path to resolve. Not worth it today for a code path the image is never meant to use.

## Next.js's `output: 'standalone'` build silently copies `.env` files into the build output

**Error:** None directly - this is the _mechanism_ behind the entry above actually firing in production, and (more seriously) a secrets-leak vector: any secret present in a local `.env` ends up copied into `.next/standalone/packages/pdf-shop/website/.env`, and from there into any Docker image whose `COPY`/`.dockerignore` isn't specifically written to exclude it. This means the `.env` file can end up inside the deployed Cloud Run image.

**Where:** `next build`'s `output: 'standalone'` mode (`next.config.js`).

**Root cause:** Undocumented (or at least not prominently documented) Next.js behavior - the standalone output tracer copies `.env*` files it finds alongside the traced entry point into the output directory, apparently on the assumption a deployer might want them available at runtime. It doesn't distinguish a _local-dev-only_ `.env` (this project's convention, per `README.md`/`RUNBOOK.md`) from one genuinely meant for the deployed target.

`website/.dockerignore`'s `.env*` entry does **not** guard against this - confirmed empirically (built the image, inspected it, the file was present). A bare pattern like `.env*` only matches at the build-context _root_, unlike `.gitignore`'s default recursive-by-basename matching; it has no effect on this nested, build-generated copy several directories deep.

**Decision:** `website/Dockerfile`'s standalone copy step uses BuildKit's `COPY --exclude=**/.env*` (requires the `# syntax=docker/dockerfile:1` directive at the top of the file) instead of relying on `.dockerignore` or a copy-then-`rm` - this prevents `.env` from ever entering an image layer at all.

**If this ever needs to be fixed differently:** if a future Next.js version adds a supported config option to disable this auto-copy behavior, prefer that over the Dockerfile-level `--exclude` workaround. Worth re-checking on any Next.js major/minor upgrade.
