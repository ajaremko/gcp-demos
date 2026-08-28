import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { tag, labels } from '../config'
import { provider } from '../project'
import { secretManagerService } from '../services'

export const litestreamConfSecret = new gcp.secretmanager.Secret(
  `${tag}-litestream-conf-secret`,
  {
    secretId: 'blog-litestream-conf',
    labels,
    replication: {
      auto: {},
    },
    deletionProtection: false,
  },
  { provider, dependsOn: secretManagerService },
)

export function makeLitestreamConfSecretVersion(
  litestreamConf: pulumi.Input<string>,
) {
  return new gcp.secretmanager.SecretVersion(
    `${tag}-litestream-conf-secret-version`,
    {
      secret: litestreamConfSecret.id,
      secretData: litestreamConf,
    },
    { provider },
  )
}
