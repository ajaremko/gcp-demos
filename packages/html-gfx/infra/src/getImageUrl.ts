import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import {
  artifactRegistryLocation,
  artifactRegistryRepositoryId,
  sharedProject,
} from './config'
import { artifactRegistryService } from './services'
import { provider } from './project'

// If an image is specified in config, use that. Otherwise, fall back to a public sample image.
export function getImageUrl(app: string, tag?: string) {
  if (!tag) {
    console.warn(`No tag specified for ${app}, using public sample image.`)
    return pulumi.output('gcr.io/google-samples/hello-app:1.0')
  }

  const image = gcp.artifactregistry.getDockerImageOutput(
    {
      location: artifactRegistryLocation,
      repositoryId: artifactRegistryRepositoryId,
      imageName: `${app}:${tag}`,
      project: sharedProject,
    },
    { provider, dependsOn: [artifactRegistryService] },
  )

  return image.selfLink
}
