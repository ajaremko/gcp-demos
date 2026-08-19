import * as gcp from '@pulumi/gcp'

import { tag, workloadIdentityPoolId } from './config'
import { IAMService, IAMCredentialsService } from './services'
import { provider } from './project'

export const identityPool = new gcp.iam.WorkloadIdentityPool(
  `${tag}-shared-identity-pool`,
  {
    workloadIdentityPoolId,
    displayName: 'Shared Identity Pool',
    description: 'Identity pool for shared services',
  },
  {
    dependsOn: [IAMService, IAMCredentialsService],
    provider,
  }
)
