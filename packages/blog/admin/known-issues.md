# Known Issues

## `/admin` returns 500 in the Docker image: sharp can't load libvips

**Error:**

```
ERR_DLOPEN_FAILED: Error loading shared library libvips-cpp.so.8.17.3: No
such file or directory (needed by
/app/node_modules/@img/sharp-linuxmusl-x64/lib/sharp-linuxmusl-x64.node)
```

**Where:** Any request that hits sharp (Payload's image pipeline - `/admin`
triggers it on first load), only inside the built Docker image
(`node:22-alpine`). Doesn't reproduce running `next dev`/`next start` on
the host.

**Root cause:** sharp's native addon and its libvips shared library are
separate npm optional-dependency packages per platform
(`@img/sharp-<platform>`, `@img/sharp-libvips-<platform>`). `npm install`
only fetches the variant matching the host it runs on - the dev/CI host
here, not Alpine/musl - so the musl variant the final image needs was
never installed anywhere. Separately, even with that package present,
sharp loads libvips via a runtime `dlopen()` rather than `require()`, which
Next's output-file-tracing can't see, so `.next/standalone` would drop it
regardless. (A Turbopack-vs-webpack difference looked like a possible cause
at first - ruled out directly: both fail identically until the install
itself is complete.) `pdf-shop-website`'s standalone output has the same
latent gap, just never triggered.

**Resolution:** `packages/blog/cms/Dockerfile` adds a `deps` build stage
that runs `npm install` against this project's real `package.json` inside
`node:22-alpine` itself, so npm's platform detection resolves the correct
pair, then copies that complete `node_modules` over the standalone output's:

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /deps
COPY package.json ./
RUN npm install
...
COPY --from=deps /deps/node_modules ./node_modules
```

Verified via `docker exec`: a complete `libvips-cpp.so` is present and
`/admin` returns `200`.

**If this ever needs to be fixed differently:** this installs from
`package.json` alone (the Docker build context can't see the root
lockfile), so it's a fresh semver resolution, not the exact graph the rest
of the monorepo was tested against. Widening the build context to include
the lockfile and switching to `npm ci` would close that gap if it ever
matters.

## `payload.config.ts` crashes in production: `next/constants` not found

**Error:**

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../node_modules/next/constants'
imported from .../payload.config.ts
```

**Where:** Production only (`payload migrate`, or any real startup) -
`payload.config.ts` is loaded as raw source via `PAYLOAD_CONFIG_PATH`, not
through Next's bundler.

**Root cause:** Next's standalone output ships a *traced* copy of `next`
itself (only what Next's own compiled code needs) nested under the
project's own `node_modules`. Node resolves `next/constants` to that copy
first - it's missing the shim file entirely, since nothing in Next's own
bundle imports it that way. The complete `next` install elsewhere in the
image is never reached, since Node commits to the first-found package by
name.

**Resolution:** Don't import `PHASE_PRODUCTION_BUILD` from `next/constants` -
hardcode the string value (`'phase-production-build'`) directly in
`payload.config.ts` instead.
