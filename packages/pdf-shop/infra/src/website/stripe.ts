import * as gcp from '@pulumi/gcp'

import { tag, labels } from '../config'
import { provider } from '../project'
import { secretManagerService } from '../services'

export const stripeSecretKey = new gcp.secretmanager.Secret(
  `${tag}-stripe-secret-key`,
  {
    secretId: 'website-stripe-secret-key',
    labels,
    replication: {
      auto: {},
    },
    deletionProtection: false,
  },
  { provider, dependsOn: secretManagerService },
)
