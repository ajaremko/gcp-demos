import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { tag, gcpProject } from '../config'
import { provider } from '../project'

import { dataBucket } from './storage'
import { ghostDbUserPasswordSecret } from './mysql'

export const ghostServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-ghost-sa`,
  {
    accountId: `${tag}-ghost-sa`,
    displayName: 'Ghost Service Account',
  },
  { provider },
)

export const dataBucketObjectCreatorBinding = new gcp.storage.BucketIAMMember(
  `${tag}-data-bucket-object-creator`,
  {
    bucket: dataBucket.name,
    role: 'roles/storage.objectCreator',
    member: pulumi.interpolate`serviceAccount:${ghostServiceAccount.email}`,
  },
  { provider },
)

export const dataBucketObjectViewerBinding = new gcp.storage.BucketIAMMember(
  `${tag}-data-bucket-object-viewer`,
  {
    bucket: dataBucket.name,
    role: 'roles/storage.objectViewer',
    member: pulumi.interpolate`serviceAccount:${ghostServiceAccount.email}`,
  },
  { provider },
)

export const ghostDbUserPasswordSecretAccessorBinding =
  new gcp.secretmanager.SecretIamMember(
    `${tag}-ghost-db-user-password-accessor`,
    {
      secretId: ghostDbUserPasswordSecret.secretId,
      role: 'roles/secretmanager.secretAccessor',
      member: pulumi.interpolate`serviceAccount:${ghostServiceAccount.email}`,
    },
    { provider },
  )

export const cloudSqlClientBinding = new gcp.projects.IAMMember(
  `${tag}-ghost-sql-client`,
  {
    project: gcpProject,
    role: 'roles/cloudsql.client',
    member: pulumi.interpolate`serviceAccount:${ghostServiceAccount.email}`,
  },
  { provider },
)

export const iamBindings = [
  dataBucketObjectCreatorBinding,
  dataBucketObjectViewerBinding,
  ghostDbUserPasswordSecretAccessorBinding,
  cloudSqlClientBinding,
]
