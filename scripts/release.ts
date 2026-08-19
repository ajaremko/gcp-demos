/// <reference types="node" />
import { ReleaseClient } from 'nx/release'

const dockerVersionScheme =
  process.argv
    .find((a: string) => a.startsWith('--dockerVersionScheme='))
    ?.split('=')[1] ?? 'staging'
const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-d')

// @nx/docker's own dry-run check reads process.env.NX_DRY_RUN directly rather
// than receiving `dryRun` as a parameter, so it has to be set explicitly here
// too — passing `dryRun: true` to client.release() below is not sufficient on
// its own to prevent a real `docker tag` from running.
if (dryRun) {
  process.env.NX_DRY_RUN = 'true'
}

const client = new ReleaseClient({
  groups: {
    'pdf-shop': {
      projects: ['pdf-shop-*'],
      projectsRelationship: 'independent',
      docker: {
        registryUrl: process.env.DOCKER_REGISTRY,
      },
    },
  },
})

client
  .release({
    groups: ['pdf-shop'],
    dockerVersionScheme,
    dryRun,
  })
  .then(() => {
    console.log('Release complete')
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
