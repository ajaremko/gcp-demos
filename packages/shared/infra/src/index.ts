import {
  githubActionIdentityPoolProvider,
  githubActionServiceAccount,
} from './github-action-runner'

export const githubActionIdentityPoolProviderName =
  githubActionIdentityPoolProvider.name
export const githubActionServiceAccountEmail = githubActionServiceAccount.email

import { artifactRegistry } from './artifact-registry'

export const artifactRegistryUri = artifactRegistry.registryUri
export const artifactRegistryLocation = artifactRegistry.location
export const artifactRegistryName = artifactRegistry.name
export const artifactRegistryRepositoryId = artifactRegistry.repositoryId

/**
 * Base URI for the shared Artifact Registry.
 * Example: us-central1-docker.pkg.dev
 */
export const artifactRegistryBaseUri = artifactRegistryUri.apply(
  (uri) => uri.split('/')[0],
)

export { gcpProject, gcpRegion } from './config'
