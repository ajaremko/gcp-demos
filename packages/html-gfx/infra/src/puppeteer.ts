import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { tag, labels } from './config'
import { provider } from './project'
import { secretManagerService } from './services'

export const puppeteerConfigSecret = new gcp.secretmanager.Secret(
  `${tag}-puppeteer-conf-secret`,
  {
    secretId: `${tag}-puppeteer-conf`,
    labels,
    replication: {
      auto: {},
    },
    deletionProtection: false,
  },
  { provider, dependsOn: secretManagerService },
)

export function makePuppeteerConfigSecretVersion(config: pulumi.Input<string>) {
  return new gcp.secretmanager.SecretVersion(
    `${tag}-puppeteer-conf-secret-version`,
    {
      secret: puppeteerConfigSecret.id,
      secretData: config,
    },
    { provider, dependsOn: puppeteerConfigSecret },
  )
}
