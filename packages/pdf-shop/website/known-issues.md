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
