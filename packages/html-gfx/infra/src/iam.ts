import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { cloudRunServiceAgentEmail, sharedProvider } from './project'
import { sharedProject, artifactRegistryName, tag } from './config'

export const cloudRunArtifactRegistryReader =
  new gcp.artifactregistry.RepositoryIamMember(
    `${tag}-cloud-run-service-agent-binding`,
    {
      role: 'roles/artifactregistry.reader',
      member: pulumi.interpolate`serviceAccount:${cloudRunServiceAgentEmail}`,
      project: sharedProject,
      repository: artifactRegistryName,
    },
    { provider: sharedProvider, retainOnDelete: true },
  )
