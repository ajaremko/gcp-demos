import * as gcp from '@pulumi/gcp'

import { tag, labels } from '../config'
import { provider } from '../project'
import { secretManagerService } from '../services'

export const ghostContentKeySecret = new gcp.secretmanager.Secret(
  `${tag}-ghost-content-key-secret`,
  {
    secretId: 'blog-website-ghost-content-key',
    labels,
    replication: {
      auto: {},
    },
    deletionProtection: false,
  },
  { provider, dependsOn: secretManagerService },
)
