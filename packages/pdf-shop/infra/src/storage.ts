import * as gcp from '@pulumi/gcp'

import { gcpRegion } from './config'
import { labels, tag } from './config'
import { storageService } from './services'
import { provider } from './project'

export const dataBucket = new gcp.storage.Bucket(
  `${tag}-bucket`,
  {
    location: gcpRegion,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
    forceDestroy: true,
    labels,
  },
  {
    dependsOn: [storageService],
    provider,
  },
)
