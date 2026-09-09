import * as gcp from '@pulumi/gcp'

import {
  gcpRegion,
  websiteImageTag,
  rendererImageTag,
  tag,
  deletionProtection,
} from './config'
import { cloudRunService } from './services'
import { provider } from './project'
import { getImageUrl } from './getImageUrl'
import { cloudRunArtifactRegistryReader } from './iam'

import { iamBindings, htmlGfxServiceAccount } from './service-account'

export const htmlGfxService = new gcp.cloudrunv2.Service(
  `${tag}-service`,
  {
    location: gcpRegion,
    deletionProtection,
    template: {
      serviceAccount: htmlGfxServiceAccount.email,
      scaling: {
        minInstanceCount: 0,
        maxInstanceCount: 1,
      },
      volumes: [{ name: 'render-output', emptyDir: {} }],
      containers: [
        {
          name: 'website',
          image: getImageUrl('html-gfx-website', websiteImageTag),
          ports: { containerPort: 8080 },
          resources: {
            limits: { cpu: '1', memory: '512Mi' },
            startupCpuBoost: true,
            cpuIdle: true,
          },
          envs: [
            { name: 'HOST', value: '0.0.0.0' },
            { name: 'RENDERER_API_URL', value: 'http://127.0.0.1:3000' },
            { name: 'OUTPUT_DIR', value: '/tmp/output' },
            {
              name: 'LOG_LEVEL',
              value: 'info',
            },
          ],
          volumeMounts: [{ name: 'render-output', mountPath: '/tmp/output' }],
        },
        {
          name: 'renderer',
          image: getImageUrl('html-gfx-renderer', rendererImageTag),
          resources: {
            limits: { cpu: '1', memory: '512Mi' },
            startupCpuBoost: true,
            cpuIdle: true,
          },
          envs: [
            { name: 'PORT', value: '3000' },
            { name: 'OUTPUT_DIR', value: '/tmp/output' },
            { name: 'MAX_PAGES', value: '10' },
            {
              name: 'LOG_LEVEL',
              value: 'info',
            },
          ],
          volumeMounts: [{ name: 'render-output', mountPath: '/tmp/output' }],
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

export const htmlGfxServicePublicAccess = new gcp.cloudrunv2.ServiceIamMember(
  `${tag}-service-public-access`,
  {
    name: htmlGfxService.name,
    location: gcpRegion,
    role: 'roles/run.invoker',
    member: 'allUsers',
  },
  { provider },
)
