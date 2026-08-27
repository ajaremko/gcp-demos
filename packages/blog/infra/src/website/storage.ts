import * as gcp from '@pulumi/gcp'

import { gcpRegion, labels, tag } from '../config'
import { storageService } from '../services'
import { provider } from '../project'

export const cacheBucket = new gcp.storage.Bucket(
  `${tag}-website-cache-bucket`,
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
