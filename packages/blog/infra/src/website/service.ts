import * as gcp from '@pulumi/gcp'

import {
  gcpRegion,
  websiteImageTag,
  tag,
  ghostContentKeySecretVersion,
  deletionProtection,
  ghostAdminUrl,
} from '../config'
import { cloudRunService } from '../services'
import { provider } from '../project'
import { getImageUrl } from '../getImageUrl'
import { cloudRunArtifactRegistryReader } from '../iam'

import { iamBindings, websiteServiceAccount } from './service-account'
import { ghostContentKeySecret } from './ghost'
import { cacheBucket } from './storage'

const ghostContentKeySecretMount = ghostContentKeySecretVersion
  ? [
      {
        name: 'GHOST_CONTENT_KEY',
        valueSource: {
          secretKeyRef: {
            secret: ghostContentKeySecret.secretId,
            version: ghostContentKeySecretVersion,
          },
        },
      },
    ]
  : []

export const websiteService = new gcp.cloudrunv2.Service(
  `${tag}-website-service`,
  {
    location: gcpRegion,
    deletionProtection,
    template: {
      serviceAccount: websiteServiceAccount.email,
      executionEnvironment: 'EXECUTION_ENVIRONMENT_GEN2',
      volumes: [
        {
          name: 'response-cache',
          gcs: {
            bucket: cacheBucket.name,
            readOnly: false,
          },
        },
      ],
      scaling: {
        minInstanceCount: 0,
        maxInstanceCount: 1,
      },
      containers: [
        {
          image: getImageUrl('blog-website', websiteImageTag),
          volumeMounts: [
            {
              name: 'response-cache',
              mountPath: '/mnt/response-cache',
            },
          ],
          envs: [
            {
              name: 'GHOST_ADMIN_URL',
              value: ghostAdminUrl,
            },
            {
              name: 'RESPONSE_CACHE_DIR',
              value: '/mnt/response-cache',
            },
            ...ghostContentKeySecretMount,
          ],
        },
      ],
    },
  },
  {
    dependsOn: [
      cloudRunService,
      cloudRunArtifactRegistryReader,
      ...iamBindings,
    ],
    provider,
  },
)

export const websiteServicePublicAccess = new gcp.cloudrunv2.ServiceIamMember(
  `${tag}-website-service-public-access`,
  {
    name: websiteService.name,
    location: gcpRegion,
    role: 'roles/run.invoker',
    member: 'allUsers',
  },
  { provider },
)
