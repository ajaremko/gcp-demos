import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { tag } from './config'
import { provider } from './project'

import { nginxConfSecret } from './nginx'
import {
  litestreamConfSecret,
  litestreamStartupScriptSecret,
} from './litestream'
import { payloadSecretKeySecret } from './payload'
import { dataBucket, mediaBucket } from './storage'

export const websiteServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-sa`,
  {
    accountId: `${tag}-sa`,
    displayName: 'Website Service Account',
  },
  { provider },
)

export const dataBucketObjectAdminBinding = new gcp.storage.BucketIAMMember(
  `${tag}-sa-data-bucket-object-admin`,
  {
    bucket: dataBucket.name,
    role: 'roles/storage.objectAdmin',
    member: pulumi.interpolate`serviceAccount:${websiteServiceAccount.email}`,
  },
  { provider },
)

export const mediaBucketObjectAdminBinding = new gcp.storage.BucketIAMMember(
  `${tag}-sa-media-bucket-object-admin`,
  {
    bucket: mediaBucket.name,
    role: 'roles/storage.objectAdmin',
    member: pulumi.interpolate`serviceAccount:${websiteServiceAccount.email}`,
  },
  { provider },
)

export const litestreamConfSecretAccessorBinding =
  new gcp.secretmanager.SecretIamMember(
    `${tag}-sa-litestream-conf-accessor`,
    {
      secretId: litestreamConfSecret.secretId,
      role: 'roles/secretmanager.secretAccessor',
      member: pulumi.interpolate`serviceAccount:${websiteServiceAccount.email}`,
    },
    { provider },
  )

export const litestreamStartupScriptSecretAccessorBinding =
  new gcp.secretmanager.SecretIamMember(
    `${tag}-sa-litestream-startup-script-accessor`,
    {
      secretId: litestreamStartupScriptSecret.secretId,
      role: 'roles/secretmanager.secretAccessor',
      member: pulumi.interpolate`serviceAccount:${websiteServiceAccount.email}`,
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

export const payloadSecretKeySecretAccessorBinding =
  new gcp.secretmanager.SecretIamMember(
    `${tag}-sa-payload-secret-key-accessor`,
    {
      secretId: payloadSecretKeySecret.secretId,
      role: 'roles/secretmanager.secretAccessor',
      member: pulumi.interpolate`serviceAccount:${websiteServiceAccount.email}`,
    },
    { provider },
  )

export const iamBindings = [
  dataBucketObjectAdminBinding,
  mediaBucketObjectAdminBinding,
  nginxConfSecretAccessorBinding,
  litestreamConfSecretAccessorBinding,
  litestreamStartupScriptSecretAccessorBinding,
  payloadSecretKeySecretAccessorBinding,
]
