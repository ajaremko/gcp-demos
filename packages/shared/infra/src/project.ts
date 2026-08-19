import * as gcp from '@pulumi/gcp'

import { gcpProject, gcpRegion, tag } from './config'

export const provider = new gcp.Provider(tag, {
  project: gcpProject,
  region: gcpRegion,
})

export const gcsAccount = gcp.storage.getProjectServiceAccountOutput(
  {},
  { provider }
)
