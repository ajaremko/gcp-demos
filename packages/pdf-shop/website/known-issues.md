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
