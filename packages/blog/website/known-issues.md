# Known Issues

## `astro build` fails with `cookie` named-export/CommonJS error

**Error:**

```
Named export 'parseCookie' not found. The requested module 'cookie' is a
CommonJS module, which may not support all module.exports as named exports.
  Location:
    node_modules/astro/dist/core/build/default-prerenderer.js:17:30
```

**Where:** `npm run build` (`astro build`), during the "Rearranging server
assets" step, after content sync/type-gen/Vite build all succeed. Does not
occur in `astro dev`.

**Root cause:** Astro depends on `cookie@^2.0.1` (ESM, exports `parseCookie`/
`stringifySetCookie`), correctly nested at
`node_modules/astro/node_modules/cookie`. Separately, at the workspace root,
`node_modules/cookie` is `0.7.2` (old CJS-only API) - hoisted there because
`express@^0.7.1`, a transitive dependency of `@nx/module-federation`,
`@nx/react`, and `webpack-dev-server`, requires `cookie@~0.7.1`. Normal/
correct npm workspace hoisting; nothing wrong with the install itself.

Astro's prerender build step compiles a standalone entry chunk to
`dist/.prerender/prerender-entry.*.mjs`, using a dedicated Vite "prerender"
build environment (`node_modules/astro/dist/core/build/vite-build-config.js`).
That chunk left `cookie` as an external, unbundled `import ... from
"cookie"` rather than inlining it. Because the chunk is dynamically imported
from inside the project's own `dist/` output (not from inside
`node_modules/astro`), Node's module resolution walks up from
`dist/.prerender/` and finds the hoisted, incompatible root `cookie@0.7.2`
first - it never reaches the correctly-nested
`astro/node_modules/cookie@2.0.1`. Confirmed directly: a real ESM
`import('cookie')` run from inside `node_modules/astro/dist/core/build/`
resolves correctly to the nested v2 package; the mismatch only reproduces
when resolving from the `dist/` output location, matching where Astro's
generated chunk actually lives.

Setting `vite.ssr.noExternal` alone did not fix this - the "prerender" build
uses an isolated Vite Environment (`ASTRO_VITE_ENVIRONMENT_NAMES.prerender`)
that doesn't inherit the top-level `ssr` config.

**Resolution:** Added `noExternal: ['cookie']` under both
`vite.environments.prerender.resolve` and `vite.environments.ssr.resolve` in
`astro.config.mjs`, forcing Vite to bundle `cookie` into the prerender/SSR
output chunks instead of leaving it as a runtime-resolved bare specifier.
Scoped to this project's Vite config only - does not touch the
workspace-wide `express`/`cookie@0.7.2` dependency chain used by Nx tooling.

Verified: `rm -rf dist && npm run build` completes cleanly (all 8 pages
generated, no errors); `grep -rn "from \"cookie\"" dist` finds nothing
(confirms the import was inlined, not left external); `npm run preview`
serves the homepage with `HTTP 200` and the expected `<title>`.
