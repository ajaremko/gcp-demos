import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { tag } from '../config'
import { dataBucket } from '../storage'
import { provider } from '../project'

export const workerServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-worker-sa`,
  {
    accountId: `${tag}-worker-sa`,
    displayName: 'Worker Service Account (Website)',
  },
  { provider },
)

export const bucketObjectViewerBinding = new gcp.storage.BucketIAMMember(
  `${tag}-worker-bucket-object-viewer`,
  {
    bucket: dataBucket.name,
    role: 'roles/storage.objectViewer',
    member: pulumi.interpolate`serviceAccount:${workerServiceAccount.email}`,
  },
  { provider },
)

export const bucketObjectCreatorBinding = new gcp.storage.BucketIAMMember(
  `${tag}-worker-bucket-object-creator`,
  {
    bucket: dataBucket.name,
    role: 'roles/storage.objectCreator',
    member: pulumi.interpolate`serviceAccount:${workerServiceAccount.email}`,
  },
  { provider },
)

export const iamMembers = [
  bucketObjectCreatorBinding,
  bucketObjectViewerBinding,
]
