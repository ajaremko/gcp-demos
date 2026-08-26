import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { tag } from '../config'
import { provider } from '../project'

import { dataBucket } from './storage'
import { backendDbUserPasswordSecret } from './mysql'

export const websiteServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-website-sa`,
  {
    accountId: `${tag}-website-sa`,
    displayName: 'Website Service Account',
  },
  { provider },
)

export const dataBucketObjectCreatorBinding = new gcp.storage.BucketIAMMember(
  `${tag}-data-bucket-object-creator`,
  {
    bucket: dataBucket.name,
    role: 'roles/storage.objectCreator',
    member: pulumi.interpolate`serviceAccount:${websiteServiceAccount.email}`,
  },
  { provider },
)

export const dataBucketObjectViewerBinding = new gcp.storage.BucketIAMMember(
  `${tag}-data-bucket-object-viewer`,
  {
    bucket: dataBucket.name,
    role: 'roles/storage.objectViewer',
    member: pulumi.interpolate`serviceAccount:${websiteServiceAccount.email}`,
  },
  { provider },
)

export const backendDbUserPasswordSecretAccessorBinding =
  new gcp.secretmanager.SecretIamMember(
    `${tag}-website-backend-db-user-password-accessor`,
    {
      secretId: backendDbUserPasswordSecret.secretId,
      role: 'roles/secretmanager.secretAccessor',
      member: pulumi.interpolate`serviceAccount:${websiteServiceAccount.email}`,
    },
    { provider },
  )

export const iamBindings = [
  dataBucketObjectCreatorBinding,
  dataBucketObjectViewerBinding,
  backendDbUserPasswordSecretAccessorBinding,
]
