import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { tag } from '../config'
import { provider } from '../project'

import { ghostContentKeySecret } from './ghost'
import { cacheBucket } from './storage'

export const websiteServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-website-sa`,
  {
    accountId: `${tag}-website-sa`,
    displayName: 'Website Service Account',
  },
  { provider },
)

export const ghostContentKeySecretAccessorBinding =
  new gcp.secretmanager.SecretIamMember(
    `${tag}-website-ghost-content-key-accessor`,
    {
      secretId: ghostContentKeySecret.secretId,
      role: 'roles/secretmanager.secretAccessor',
      member: pulumi.interpolate`serviceAccount:${websiteServiceAccount.email}`,
    },
    { provider },
  )

export const cacheBucketObjectCreatorBinding = new gcp.storage.BucketIAMMember(
  `${tag}-website-cache-bucket-object-creator`,
  {
    bucket: cacheBucket.name,
    role: 'roles/storage.objectCreator',
    member: pulumi.interpolate`serviceAccount:${websiteServiceAccount.email}`,
  },
  { provider },
)

export const cacheBucketObjectViewerBinding = new gcp.storage.BucketIAMMember(
  `${tag}-website-cache-bucket-object-viewer`,
  {
    bucket: cacheBucket.name,
    role: 'roles/storage.objectViewer',
    member: pulumi.interpolate`serviceAccount:${websiteServiceAccount.email}`,
  },
  { provider },
)

export const iamBindings = [
  ghostContentKeySecretAccessorBinding,
  cacheBucketObjectCreatorBinding,
  cacheBucketObjectViewerBinding,
]
