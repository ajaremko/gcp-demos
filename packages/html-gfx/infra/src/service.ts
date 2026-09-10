import * as gcp from '@pulumi/gcp'

import {
  gcpRegion,
  websiteImageTag,
  rendererImageTag,
  tag,
  deletionProtection,
} from './config'
import { iamBindings, htmlGfxServiceAccount } from './service-account'
import {
  puppeteerConfigSecret,
  makePuppeteerConfigSecretVersion,
} from './puppeteer'
import { cloudRunService } from './services'
import { provider } from './project'
import { getImageUrl } from './getImageUrl'
import { cloudRunArtifactRegistryReader } from './iam'

const puppeteerConfigSecretVersion = makePuppeteerConfigSecretVersion(
  JSON.stringify({
    headless: true,
    executablePath: '/usr/bin/google-chrome-stable',
    timeout: 300000, // Extend timeout for cloud run environment
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // Prevents silent crashes due to Docker memory limits
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--single-process',
    ],
  }),
)

export const htmlGfxService = new gcp.cloudrunv2.Service(
  `${tag}-service`,
  {
    location: gcpRegion,
    deletionProtection,
    template: {
      serviceAccount: htmlGfxServiceAccount.email,
      // Cloud Run's default (gen1) sandbox runs on gVisor, which
      // proxies every syscall through a userspace kernel
      // Chrome took ~5 minutes just to boot under gen1
      // gen2 uses a full-Linux-kernel microVM instead - Google's
      // own recommended environment for exactly this class of
      // CPU-heavy/compatibility-sensitive workload.
      executionEnvironment: 'EXECUTION_ENVIRONMENT_GEN2',
      scaling: {
        minInstanceCount: 0,
        maxInstanceCount: 1,
      },
      volumes: [
        { name: 'render-output', emptyDir: {} },
        {
          name: 'puppeteer-conf',
          secret: {
            secret: puppeteerConfigSecret.secretId,
            items: [
              {
                version: puppeteerConfigSecretVersion.version,
                path: 'launch-config.json',
              },
            ],
          },
        },
      ],
      containers: [
        {
          name: 'website',
          image: getImageUrl('html-gfx-website', websiteImageTag),
          ports: { containerPort: 8080 },
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
          // A reasonable budget to start chrome up ith
          resources: {
            limits: { cpu: '2', memory: '1Gi' },
            startupCpuBoost: true,
            cpuIdle: true,
          },
          envs: [
            { name: 'PORT', value: '3000' },
            { name: 'OUTPUT_DIR', value: '/tmp/output' },
            { name: 'MAX_PAGES', value: '10' },
            {
              name: 'PUPPETEER_LAUNCH_CONFIG',
              value: '/etc/html-gfx/launch-config.json',
            },
            {
              name: 'LOG_LEVEL',
              value: 'trace',
            },
          ],
          volumeMounts: [
            { name: 'render-output', mountPath: '/tmp/output' },
            { name: 'puppeteer-conf', mountPath: '/etc/html-gfx' },
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
