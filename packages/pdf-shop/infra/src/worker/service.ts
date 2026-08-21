import * as gcp from '@pulumi/gcp'

import { deletionProtection, gcpRegion, tag, workerImageTag } from '../config'
import { cloudRunArtifactRegistryReader } from '../iam'
import { cloudRunService } from '../services'
import { getImageUrl } from '../getImageUrl'
import { provider } from '../project'
import { dataBucketName } from '../data'

import { workerServiceAccount, iamMembers } from './service-account'

export const workerService = new gcp.cloudrunv2.Service(
  `${tag}-worker-service`,
  {
    location: gcpRegion,
    deletionProtection,
    template: {
      executionEnvironment: 'EXECUTION_ENVIRONMENT_GEN2',
      serviceAccount: workerServiceAccount.email,
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
              value: 'info',
            },
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
    dependsOn: [cloudRunService, cloudRunArtifactRegistryReader, ...iamMembers],
    provider,
  },
)
