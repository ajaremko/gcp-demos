import * as gcp from '@pulumi/gcp'

import {
  gcpProject,
  gcpRegion,
  websiteImageTag,
  tag,
  stripeSecretKeySecretVersion,
} from '../config'
import { cloudRunService } from '../services'
import { provider } from '../project'
import { getImageUrl } from '../getImageUrl'
import { cloudRunArtifactRegistryReader } from '../iam'

import { iamBindings, websiteServiceAccount } from './service-account'
import { stripeSecretKeySecret } from './stripe'

const stripeSecretKeySecretMount = stripeSecretKeySecretVersion
  ? [
      {
        name: 'STRIPE_SECRET_KEY',
        valueSource: {
          secretKeyRef: {
            secret: stripeSecretKeySecret.secretId,
            version: stripeSecretKeySecretVersion,
          },
        },
      },
    ]
  : []

export const websiteService = new gcp.cloudrun.Service(
  `${tag}-website-service`,
  {
    location: gcpRegion,
    metadata: {
      namespace: gcpProject,
      annotations: {},
    },
    template: {
      spec: {
        serviceAccountName: websiteServiceAccount.email,
        volumes: [],
        containers: [
          {
            image: getImageUrl('pdf-shop-website', websiteImageTag),
            startupProbe: {
              initialDelaySeconds: 10,
              periodSeconds: 5,
              failureThreshold: 3,
              timeoutSeconds: 3,
              httpGet: {
                path: '/api/health',
              },
            },
            envs: [
              {
                name: 'PDF_SHOP_DATA_DIR',
                value: '/tmp/data',
              },
              {
                name: 'LOG_LEVEL',
                value: 'trace',
              },
              ...stripeSecretKeySecretMount,
            ],
          },
        ],
      },
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
