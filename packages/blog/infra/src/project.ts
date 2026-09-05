import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import {
  sharedRegion,
  sharedProject,
  gcpProject,
  gcpRegion,
  tag,
} from './config'

export const provider = new gcp.Provider(tag, {
  project: gcpProject,
  region: gcpRegion,
})

export const project = gcp.organizations.getProjectOutput({}, { provider })

export const cloudRunServiceAgentEmail = pulumi.interpolate`service-${project.number}@serverless-robot-prod.iam.gserviceaccount.com`

export const gcsAccount = gcp.storage.getProjectServiceAccountOutput(
  {},
  { provider },
)

export const sharedProvider = new gcp.Provider(`${tag}-shared-provider`, {
  project: sharedProject,
  region: sharedRegion,
})
