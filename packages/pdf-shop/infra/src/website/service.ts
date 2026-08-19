import * as gcp from '@pulumi/gcp'

import {
  gcpRegion,
  websiteImageTag,
  tag,
  stripeSecretKeySecretVersion,
  deletionProtection,
} from '../config'
import { cloudRunService } from '../services'
import { provider } from '../project'
import { getImageUrl } from '../getImageUrl'
import { cloudRunArtifactRegistryReader } from '../iam'
import { dataBucketName } from '../data'

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

export const websiteService = new gcp.cloudrunv2.Service(
  `${tag}-website-service`,
  {
    location: gcpRegion,
    deletionProtection,
    template: {
      executionEnvironment: 'EXECUTION_ENVIRONMENT_GEN2',
      serviceAccount: websiteServiceAccount.email,
      volumes: [
        {
          name: 'data',
          gcs: {
            bucket: dataBucketName,
          },
        },
      ],
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
          volumeMounts: [
            {
              name: 'data',
              mountPath: '/tmp/data',
            },
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
