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
      containers: [
        {
          image: getImageUrl('blog-website', websiteImageTag),
          envs: [
            {
              name: 'GHOST_ADMIN_URL',
              value: ghostAdminUrl,
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
