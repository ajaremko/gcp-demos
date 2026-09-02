import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { tag, labels } from './config'
import { provider } from './project'
import { secretManagerService } from './services'

export const nginxConfSecret = new gcp.secretmanager.Secret(
  `${tag}-nginx-conf-secret`,
  {
    secretId: 'blog-nginx-conf',
    labels,
    replication: {
      auto: {},
    },
    deletionProtection: false,
  },
  { provider, dependsOn: secretManagerService },
)

export function makeNginxConfSecretVersion(nginxConf: pulumi.Input<string>) {
  return new gcp.secretmanager.SecretVersion(
    `${tag}-nginx-conf-secret-version`,
    {
      secret: nginxConfSecret.id,
      secretData: nginxConf,
    },
    { provider, dependsOn: nginxConfSecret },
  )
}
