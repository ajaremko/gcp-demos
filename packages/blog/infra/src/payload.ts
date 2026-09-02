import * as random from '@pulumi/random'
import * as gcp from '@pulumi/gcp'

import { tag, labels, deletionProtection } from './config'
import { secretManagerService } from './services'
import { provider } from './project'

const payloadSecretKey = new random.RandomPassword(
  `${tag}-payload-secret-key`,
  {
    length: 16,
    special: true,
  },
)

export const payloadSecretKeySecret = new gcp.secretmanager.Secret(
  `${tag}-payload-secret-key-secret`,
  {
    secretId: `${tag}-payload-secret-key`,
    labels,
    replication: {
      auto: {},
    },
    deletionProtection,
  },
  { provider, dependsOn: secretManagerService },
)

export const payloadSecretKeySecretVersion =
  new gcp.secretmanager.SecretVersion(
    `${tag}-payload-secret-key-secret-version`,
    {
      secret: payloadSecretKeySecret.id,
      secretData: payloadSecretKey.result,
    },
    { provider },
  )
