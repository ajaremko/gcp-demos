import * as pulumi from '@pulumi/pulumi'
import * as gcp from '@pulumi/gcp'

import { tag } from '../config'
import { provider, pubsubServiceAccountEmail } from '../project'
import { pubsubService } from '../services'

import { deadletterBucket } from './storage'

export const pubsubServiceAccountDeadletterBucketReader =
  new gcp.storage.BucketIAMMember(
    `${tag}-pubsub-sa-deadletter-bucket-reader`,
    {
      bucket: deadletterBucket.name,
      role: 'roles/storage.legacyBucketReader',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider, dependsOn: [pubsubService] }
  )

export const pubsubServiceAccountDeadletterObjectCreator =
  new gcp.storage.BucketIAMMember(
    `${tag}-pubsub-sa-deadletter-object-creator`,
    {
      bucket: deadletterBucket.name,
      role: 'roles/storage.objectCreator',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider, dependsOn: [pubsubService] }
  )

export const pubsubServiceAccountIamRoles = [
  pubsubServiceAccountDeadletterBucketReader,
  pubsubServiceAccountDeadletterObjectCreator,
]
