# Known Issues

## Nx has no supported way to make `release.docker.registryUrl` dynamic

**Error:**

```
docker tag packages-pdf-shop-website $DOCKER_REGISTRY/pdf-shop-website:2608.19.1628ab1-hotfix
error parsing reference: "${DOCKER_REGISTRY}/pdf-shop-website:2608.19.1628ab1-hotfix" is not a valid repository/tag: invalid reference format
```

**Where:** `nx.json`'s `release.groups.<name>.docker.registryUrl`, when set to a shell-style placeholder like `"${DOCKER_REGISTRY}"`, intending it to pick up the real registry URL (resolved from Pulumi's `packages/shared/infra` stack output) at release time.

**Root cause:** `nx.json` is plain JSON, so `${DOCKER_REGISTRY}` is never passed through a shell — it's read as 21 literal characters. Confirmed by reading the installed `nx`/`@nx/docker` source (`nx`/`@nx/docker` 23.1.1) directly:

- `registryUrl` is a raw, unprocessed passthrough from `nx.json` all the way through Nx's docker-release config normalization — no interpolation is ever applied to it.
- Nx does have a generic `{env.VAR_NAME}` token-interpolation utility, but tracing every call site confirms it's wired up only for `release.docker.versionSchemes` patterns and the inferred `docker:build`/`docker:run` plugin target options — never for `registryUrl`.
- The eventual `docker tag` call runs via `execFileSync('docker', [...])` — an argv array, not a shell string — so even a literal shell variable reference embedded in `nx.json` couldn't be expanded there even in principle; no shell is ever invoked.

Verified empirically (not just by reading source) by calling `@nx/docker`'s real, installed `handleDockerVersion` function directly, with `DOCKER_REGISTRY` genuinely set in the same process: both `${DOCKER_REGISTRY}` and Nx's own `{env.DOCKER_REGISTRY}` token syntax came back completely unexpanded in the resulting image reference.

Also checked `NX_DOCKER_IMAGE_REF`, an env var `@nx/docker` does read to override the entire computed image reference. It's a poor fit for a release *group* with multiple projects (`pdf-shop-website`, `pdf-shop-worker`): it's read once, globally, from `process.env`, so every project in the group would receive the same literal value — wrong, since each project needs a different image name. It would also require reimplementing `versionSchemes`' date/commit-sha computation by hand in a shell script, duplicating logic that already lives correctly in `nx.json`.

Nx's own docs state Docker release support is "currently experimental and may undergo breaking changes without following semantic versioning" — plausible explanation for why `${VAR}`-style syntax has reportedly worked in other projects/versions but doesn't here.

**Workaround:** drive the release through Nx's programmatic `nx/release` API (`ReleaseClient`) instead of the `nx release` CLI. A real JS/TS caller can read `nx.json`, patch `release.groups.<name>.docker.registryUrl` in memory with an already-resolved string (e.g. from `process.env.DOCKER_REGISTRY`), and pass the patched config into `new ReleaseClient(...)` — no template syntax needed, since there's nothing left to interpolate by the time Nx sees it. See `scripts/release-group.ts` and the "Releasing" section of the root `README.md`.

**If this ever needs to be fixed:** re-check `registryUrl`'s behavior after upgrading `nx`/`@nx/docker` past `23.1.1` — given the "experimental, breaking changes outside semver" framing, a future version may add real interpolation support for this field (or document an intentionally-different mechanism). If so, `scripts/release-group.ts`'s config-patching workaround could likely be dropped in favor of a plain `nx.json` value.
