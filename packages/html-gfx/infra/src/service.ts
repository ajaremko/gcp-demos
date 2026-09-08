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

import { iamBindings, websiteServiceAccount } from './service-account'
import { nginxConfSecret, makeNginxConfSecretVersion } from './nginx'

const nginxConfSecretVersion = makeNginxConfSecretVersion(`
server {
  listen 8080;
  client_max_body_size 64m;
 
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto https;
  proxy_read_timeout 300s;
 
  location = /healthz { return 200 'ok'; add_header Content-Type text/plain; }
  location /       { proxy_pass http://127.0.0.1:4321; }
}
`)

export const htmlGfxService = new gcp.cloudrunv2.Service(
  `${tag}-service`,
  {
    location: gcpRegion,
    deletionProtection,
    template: {
      serviceAccount: websiteServiceAccount.email,
      scaling: {
        minInstanceCount: 0,
        maxInstanceCount: 1,
      },
      volumes: [
        {
          name: 'nginx-conf',
          secret: {
            secret: nginxConfSecret.secretId,
            items: [
              { version: nginxConfSecretVersion.version, path: 'default.conf' },
            ],
          },
        },
      ],
      containers: [
        {
          name: 'gateway',
          image: 'nginx:1.27-alpine',
          ports: { containerPort: 8080 },
          dependsOns: ['website'],
          startupProbe: {
            httpGet: { path: '/healthz', port: 8080 },
            periodSeconds: 1,
            failureThreshold: 20,
          },
          resources: {
            limits: { cpu: '0.25', memory: '128Mi' },
            cpuIdle: true,
          },
          volumeMounts: [
            { name: 'nginx-conf', mountPath: '/etc/nginx/conf.d' },
          ],
        },
        {
          name: 'website',
          image: getImageUrl('html-gfx-website', websiteImageTag),
          resources: {
            limits: { cpu: '0.75', memory: '512Mi' },
            startupCpuBoost: true,
            cpuIdle: true,
          },
          startupProbe: {
            tcpSocket: { port: 4321 },
            periodSeconds: 1,
            failureThreshold: 30,
          },
          envs: [
            { name: 'HOST', value: '0.0.0.0' },
            { name: 'PORT', value: '4321' },
            { name: 'RENDERER_API_URL', value: 'http://127.0.0.1:3000' },
            {
              name: 'LOG_LEVEL',
              value: 'info',
            },
          ],
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
