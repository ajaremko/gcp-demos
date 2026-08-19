import * as gcp from '@pulumi/gcp'

import { gcpRegion, tag, workerImageTag } from '../config'
import { cloudRunArtifactRegistryReader } from '../iam'
import { cloudRunService } from '../services'
import { getImageUrl } from '../getImageUrl'
import { provider } from '../project'

import { workerServiceAccount, iamMembers } from './service-account'

export const workerService = new gcp.cloudrunv2.Service(
  `${tag}-worker-service`,
  {
    location: gcpRegion,
    deletionProtection: false,
    template: {
      serviceAccount: workerServiceAccount.email,
      containers: [
        {
          image: getImageUrl('pdf-shop-worker', workerImageTag),
          startupProbe: {
            initialDelaySeconds: 10,
            periodSeconds: 5,
            failureThreshold: 3,
            timeoutSeconds: 3,
            httpGet: {
              path: '/health',
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
          ],
        },
      ],
    },
  },
  {
    dependsOn: [cloudRunService, cloudRunArtifactRegistryReader, ...iamMembers],
    provider,
  },
)
