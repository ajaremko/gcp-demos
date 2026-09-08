import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { tag } from './config'
import { provider } from './project'

import { nginxConfSecret } from './nginx'

export const websiteServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-sa`,
  {
    accountId: `${tag}-sa`,
    displayName: 'HTML GFX Service Account',
  },
  { provider },
)

export const nginxConfSecretAccessorBinding =
  new gcp.secretmanager.SecretIamMember(
    `${tag}-sa-nginx-conf-accessor`,
    {
      secretId: nginxConfSecret.secretId,
      role: 'roles/secretmanager.secretAccessor',
      member: pulumi.interpolate`serviceAccount:${websiteServiceAccount.email}`,
    },
    { provider },
  )

export const iamBindings = [nginxConfSecretAccessorBinding]
