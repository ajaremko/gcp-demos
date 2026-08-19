import * as gcp from '@pulumi/gcp'

import { gcpProject, gcpRegion, websiteImageTag, tag } from '../config'
import { cloudRunService } from '../services'
import { provider } from '../project'
import { getImageUrl } from '../getImageUrl'
import { cloudRunArtifactRegistryReader } from '../iam'

import { iamBindings, websiteServiceAccount } from './service-account'

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
                path: '/health',
              },
            },
            envs: [],
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
