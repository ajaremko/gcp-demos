# Known Issues

## Stripe PaymentElement MutationObserver error (dev only)

**Error:**

```
Uncaught TypeError: Failed to execute 'observe' on 'MutationObserver': parameter 1 is not of type 'Node'
```

**Where:** Payment page (`/payment`), in the browser console, during local development only (`nx dev`). Does not occur in production builds (`nx build` / `next start`).

**Root cause:** `next.config.js` doesn't set `reactStrictMode`. Next.js 16.1.7 defaults the App Router tree to StrictMode-enabled when that option is unset (confirmed directly in `node_modules/next/dist/build/define-env.js`: `__NEXT_STRICT_MODE_APP` resolves to `true` when the config value is `null`/unset). In development, StrictMode double-invokes every component's mount effects as a bug-detection aid. This races against a well-documented upstream timing issue in `@stripe/react-stripe-js`, whose internal `Elements`/`PaymentElement` mount effect sets up a `MutationObserver` on its container — the synthetic double-invoke trips an internal assumption in Stripe's library and throws this error.

This is a known, dev-only artifact of the Stripe.js + React StrictMode interaction. It does not affect production behavior or actual payment functionality — investigated and ruled out every application-level cause first (single `<Elements>`/`<PaymentElement>` mount site in `src/lib/documents/CompletePaymentForm.tsx`, a correctly memoized module-singleton `stripePromise`, no conditional rendering or key churn around the Stripe components).

**Decision:** Leave as-is. Not worth trading away StrictMode's double-invoke effect-cleanup checks app-wide to silence a cosmetic dev-console error.

**If this ever needs to be fixed:** add `reactStrictMode: false` to `next.config.js`. One-line change, directly eliminates the double-invoke race. Confirmed this actually disables StrictMode for the App Router tree in the installed Next version (not just the Pages Router) — same `define-env.js` check resolves `__NEXT_STRICT_MODE_APP` to `false` when the config value is explicitly set to `false`.

## `nx dev` doesn't pick up `@org/pdf-shop-contracts` edits automatically

**Symptom:** editing a schema/type in `packages/pdf-shop/contracts/src/**` while `nx dev pdf-shop-website` is running has no effect until the contracts package is rebuilt — no hot reload, no error, the website just keeps using the previously compiled output.

**Root cause:** `@org/pdf-shop-contracts` is a real compiled buildable library (`packages/pdf-shop/contracts/package.json`'s `exports` point at `./dist/`, produced by `nx build pdf-shop-contracts`) rather than something the website's bundler reads as raw source. This is intentional — see the contracts library's own tsconfig, which inherits the workspace's NodeNext module resolution and needs a real compiled `dist/` for its `.js`-suffixed relative imports to resolve, including under Turbopack, which (confirmed via `node_modules/next/dist/server/config-shared.d.ts`) has no equivalent of webpack's `resolve.extensionAlias` to remap those at bundle time. `pdf-shop-website`'s `dev` target (`next dev`) just runs Next directly — it has no `dependsOn` relationship to `pdf-shop-contracts`'s `build`, so nothing rebuilds contracts as you edit it.

**Decision:** Leave as-is — this is standard Nx behavior for an app that depends on a buildable library, not a bug. The workspace already has the target that solves it (`watch-deps`), it's just a separate command from `dev`.

**Workaround:** run `npx nx watch-deps pdf-shop-website` alongside `npx nx dev pdf-shop-website` (separate terminal, or `npx nx run-many -t dev watch-deps -p pdf-shop-website`) — it rebuilds `pdf-shop-contracts` automatically whenever its source changes, so the website's next request picks up the new compiled output. Without it, run `npx nx build pdf-shop-contracts` manually after each contracts edit.
