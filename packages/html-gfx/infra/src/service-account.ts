import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { tag } from './config'
import { provider } from './project'
import { puppeteerConfigSecret } from './puppeteer'

export const htmlGfxServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-sa`,
  {
    accountId: `${tag}-sa`,
    displayName: 'HTML GFX Service Account',
  },
  { provider },
)

export const puppeteerConfigSecretAccessorBinding =
  new gcp.secretmanager.SecretIamMember(
    `${tag}-sa-puppeteer-conf-accessor`,
    {
      secretId: puppeteerConfigSecret.secretId,
      role: 'roles/secretmanager.secretAccessor',
      member: pulumi.interpolate`serviceAccount:${htmlGfxServiceAccount.email}`,
    },
    { provider },
  )

export const iamBindings = [puppeteerConfigSecretAccessorBinding]
