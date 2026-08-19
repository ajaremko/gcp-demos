import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { tag } from '../config'
import { provider } from '../project'

import { dataBucket } from '../storage'

export const websiteServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-website-sa`,
  {
    accountId: `${tag}-website-sa`,
    displayName: 'Website Service Account',
  },
  { provider },
)

export const bucketObjectCreatorBinding = new gcp.storage.BucketIAMMember(
  `${tag}-bucket-object-creator`,
  {
    bucket: dataBucket.name,
    role: 'roles/storage.objectCreator',
    member: pulumi.interpolate`serviceAccount:${websiteServiceAccount.email}`,
  },
  { provider },
)

export const bucketObjectViewerBinding = new gcp.storage.BucketIAMMember(
  `${tag}-bucket-object-viewer`,
  {
    bucket: dataBucket.name,
    role: 'roles/storage.objectViewer',
    member: pulumi.interpolate`serviceAccount:${websiteServiceAccount.email}`,
  },
  { provider },
)

export const iamBindings = [
  bucketObjectCreatorBinding,
  bucketObjectViewerBinding,
]
