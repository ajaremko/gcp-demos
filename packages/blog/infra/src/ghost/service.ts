import * as gcp from '@pulumi/gcp'

import {
  gcpRegion,
  ghostImageTag,
  tag,
  deletionProtection,
  ghostUrl,
  ghostAdminUrl,
  sharedMysqlInstanceId,
} from '../config'
import { getImageUrl } from '../getImageUrl'
import { cloudRunArtifactRegistryReader } from '../iam'
import { provider } from '../project'
import { cloudRunService } from '../services'

import {
  ghostDb,
  ghostDbUser,
  ghostDbUserPasswordSecret,
  ghostDbUserPasswordSecretVersion,
} from './mysql'
import { iamBindings, ghostServiceAccount } from './service-account'
import { dataBucket } from './storage'

export const ghostService = new gcp.cloudrunv2.Service(
  `${tag}-ghost-service`,
  {
    location: gcpRegion,
    deletionProtection,
    template: {
      serviceAccount: ghostServiceAccount.email,
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
          image: getImageUrl('blog-ghost', ghostImageTag),
          ports: {
            containerPort: 2368,
          },
          volumeMounts: [
            {
              name: 'cloudsql',
              mountPath: '/cloudsql',
            },
          ],
          resources: {
            limits: {
              cpu: '1',
              memory: '1024Mi',
            },
          },
          envs: [
            { name: 'url', value: ghostUrl },
            { name: 'admin__url', value: ghostAdminUrl },
            { name: 'database__client', value: 'mysql' },
            { name: 'database__connection__user', value: ghostDbUser.name },
            {
              name: 'database__connection__password',
              valueSource: {
                secretKeyRef: {
                  secret: ghostDbUserPasswordSecret.secretId,
                  version: ghostDbUserPasswordSecretVersion.version,
                },
              },
            },
            { name: 'database__connection__database', value: ghostDb.name },
            {
              name: 'database__connection__socketPath',
              value: sharedMysqlInstanceId.apply(
                (instanceId) => `/cloudsql/${instanceId}`,
              ),
            },
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

export const ghostServicePublicAccess = new gcp.cloudrunv2.ServiceIamBinding(
  `${tag}-ghost-service-public-access`,
  {
    name: ghostService.name,
    location: ghostService.location,
    role: 'roles/run.invoker',
    members: ['allUsers'],
  },
  { provider },
)
