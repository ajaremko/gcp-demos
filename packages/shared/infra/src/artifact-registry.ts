import * as gcp from '@pulumi/gcp'

import { artifactRegistryService } from './services'
import { provider } from './project'
import { tag, gcpRegion } from './config'

export const artifactRegistry = new gcp.artifactregistry.Repository(
  `${tag}-artifact-registry`,
  {
    location: gcpRegion,
    repositoryId: `${tag}-artifact-registry`,
    description: 'Application and service artifacts',
    format: 'DOCKER',
  },
  { provider, dependsOn: [artifactRegistryService] }
)
