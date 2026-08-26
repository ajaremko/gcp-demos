import * as gcp from '@pulumi/gcp'

import {
  gcpRegion,
  backendImageTag,
  tag,
  deletionProtection,
  sharedMysqlInstanceFirstIpAddress,
  sharedMysqlInstanceId,
} from '../config'
import { getImageUrl } from '../getImageUrl'
import { cloudRunArtifactRegistryReader } from '../iam'
import { provider } from '../project'
import { cloudRunService } from '../services'

import {
  backendDb,
  backendDbUser,
  backendDbUserPasswordSecret,
  backendDbUserPasswordSecretVersion,
} from './mysql'
import { iamBindings, websiteServiceAccount } from './service-account'
import { dataBucket } from './storage'

export const backendService = new gcp.cloudrunv2.Service(
  `${tag}-backend-service`,
  {
    location: gcpRegion,
    deletionProtection,
    template: {
      serviceAccount: websiteServiceAccount.email,
      volumes: [
        {
          name: 'cloudsql',
          cloudSqlInstance: {
            instances: [sharedMysqlInstanceId],
          },
        },
      ],
      containers: [
        {
          image: getImageUrl('blog-backend', backendImageTag),
          ports: {
            containerPort: 2368,
          },
          volumeMounts: [
            {
              name: 'cloudsql',
              mountPath: '/cloudsql',
            },
          ],
          envs: [
            // { name: 'url', value: 'https://your-custom-domain.com' },
            { name: 'database__client', value: 'mysql' },
            {
              name: 'database__connection__host',
              value: sharedMysqlInstanceFirstIpAddress,
            },
            {
              name: 'database__connection__socketPath',
              value: backendDb.instance.apply(
                (instance) => `/cloudsql/${instance}`,
              ),
            },
            { name: 'database__connection__user', value: backendDbUser.name },
            {
              name: 'database__connection__password',
              valueSource: {
                secretKeyRef: {
                  secret: backendDbUserPasswordSecret.secretId,
                  version: backendDbUserPasswordSecretVersion.version,
                },
              },
            },
            { name: 'database__connection__database', value: backendDb.name },
            // Enable Storage Adapter
            { name: 'storage__active', value: 'gcloud' },
            { name: 'storage__gcloud__bucket', value: dataBucket.name },
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

export const backendServicePublicAccess = new gcp.cloudrunv2.ServiceIamBinding(
  `${tag}-backend-service-public-access`,
  {
    name: backendService.name,
    location: backendService.location,
    role: 'roles/run.invoker',
    members: ['allUsers'],
  },
  { provider },
)
