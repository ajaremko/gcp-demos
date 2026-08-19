/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ReleaseClient } from 'nx/release'

// Load nx.json's own release config rather. Only registryUrl actually
// needs to vary at release time, so that's the only field overwritten.
const nxJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'nx.json'), 'utf-8'),
)

// Read group from command line arguments
const group = process.argv
  .find((a: string) => a.startsWith('--group='))
  ?.split('=')[1]

if (!group) {
  console.error('Missing required argument: --group=<name>')
  process.exit(1)
}

// Read dockerVersionScheme from command line arguments
const dockerVersionScheme = process.argv
  .find((a: string) => a.startsWith('--dockerVersionScheme='))
  ?.split('=')[1]

if (!dockerVersionScheme) {
  console.error('Missing required argument: --dockerVersionScheme=<scheme>')
  process.exit(1)
}
const dockerVersionSchemes = nxJson.release?.docker?.versionSchemes ?? {}
if (!dockerVersionSchemes[dockerVersionScheme]) {
  console.error(
    `No dockerVersionScheme named "${dockerVersionScheme}" in nx.json. Available schemes: ${Object.keys(dockerVersionSchemes).join(', ') || '(none defined)'}`,
  )
  process.exit(1)
}

// Read dry-run flag from command line arguments
const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-d')

// @nx/docker's own dry-run check reads process.env.NX_DRY_RUN directly rather
// than receiving `dryRun` as a parameter, so it has to be set explicitly here
// too — passing `dryRun: true` to client.release() below is not sufficient on
// its own to prevent a real `docker tag` from running.
if (dryRun) {
  process.env.NX_DRY_RUN = 'true'
}

const releaseGroups = nxJson.release?.groups ?? {}

if (!(group in releaseGroups)) {
  console.error(
    `No release group named "${group}" in nx.json. Available groups: ${Object.keys(releaseGroups).join(', ') || '(none defined)'}`,
  )
  process.exit(1)
}

if (!releaseGroups[group] || releaseGroups[group].docker === undefined) {
  console.error(
    `Release group "${group}" in nx.json does not have a docker configuration.`,
  )
  process.exit(1)
}
releaseGroups[group].docker.registryUrl = process.env.DOCKER_REGISTRY

const client = new ReleaseClient(nxJson.release)

client
  .release({
    groups: [group],
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
