import * as gcp from '@pulumi/gcp'

import {
  gcpRegion,
  websiteImageTag,
  cmsImageTag,
  tag,
  deletionProtection,
} from '../config'
import { cloudRunService } from '../services'
import { provider } from '../project'
import { getImageUrl } from '../getImageUrl'
import { cloudRunArtifactRegistryReader } from '../iam'

import { iamBindings, websiteServiceAccount } from './service-account'
import { nginxConfSecret, makeNginxConfSecretVersion } from './nginx'
import {
  litestreamConfSecret,
  litestreamStartupScriptSecret,
  makeLitestreamConfSecretVersion,
  makeLitestreamStartupScriptSecretVersion,
} from './litestream'
import {
  payloadSecretKeySecret,
  payloadSecretKeySecretVersion,
} from './payload'
import { dataBucket, mediaBucket } from './storage'

const nginxConfSecretVersion = makeNginxConfSecretVersion(`
server {
  listen 8080;
  client_max_body_size 64m;
 
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto https;
  proxy_read_timeout 300s;
 
  location /admin  { proxy_pass http://127.0.0.1:3000; }
  location /api    { proxy_pass http://127.0.0.1:3000; }
  location /_next  { proxy_pass http://127.0.0.1:3000; }
  location = /healthz { return 200 'ok'; add_header Content-Type text/plain; }
  location /       { proxy_pass http://127.0.0.1:4321; }
}
`)

const litestreamConfData = dataBucket.name.apply(
  (name) => `
dbs:
  - path: /data/blog.sqlite
    replica:
      type: gs
      bucket: ${name}
      path: blog.sqlite
`,
)

const litestreamConfSecretVersion =
  makeLitestreamConfSecretVersion(litestreamConfData)

const litestreamStartupScriptSecretVersion =
  makeLitestreamStartupScriptSecretVersion(`
#!/bin/sh
echo "Running with /etc/litestream.yml:"
cat /etc/litestream.yml
set -e
mkdir -p /data
echo "Running litestream restore:"
litestream restore -if-replica-exists -o /data/blog.sqlite "gs://$GCS_DATA_BUCKET/blog.sqlite"
echo "Running payload migrate:"
npx payload migrate
echo "Running litestream replicate:"
exec litestream replicate -exec "node packages/blog/cms/server.js"
`)

export const websiteService = new gcp.cloudrunv2.Service(
  `${tag}-website-service`,
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
        {
          name: 'litestream-conf',
          secret: {
            secret: litestreamConfSecret.secretId,
            items: [
              {
                version: litestreamConfSecretVersion.version,
                path: 'litestream.yml',
              },
            ],
          },
        },
        {
          name: 'litestream-startup-script',
          secret: {
            secret: litestreamStartupScriptSecret.secretId,
            items: [
              {
                version: litestreamStartupScriptSecretVersion.version,
                path: 'run.sh',
              },
            ],
          },
        },
      ],
      containers: [
        {
          name: 'gateway',
          image: 'nginx:1.27-alpine',
          ports: { containerPort: 8080 },
          dependsOns: ['website', 'cms'],
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
          image: getImageUrl('blog-website', websiteImageTag),
          startupProbe: {
            tcpSocket: { port: 4321 },
            periodSeconds: 1,
            failureThreshold: 30,
          },
          envs: [
            { name: 'HOST', value: '0.0.0.0' },
            { name: 'PORT', value: '4321' },
            { name: 'CMS_URL', value: 'http://127.0.0.1:3000' },
            {
              name: 'PAYLOAD_SECRET',
              valueSource: {
                secretKeyRef: {
                  secret: payloadSecretKeySecret.secretId,
                  version: payloadSecretKeySecretVersion.version,
                },
              },
            },
            {
              name: 'LOG_LEVEL',
              value: 'info',
            },
          ],
        },
        {
          name: 'cms',
          image: getImageUrl('blog-cms', cmsImageTag),
          resources: {
            limits: { cpu: '1', memory: '512Mi' },
            startupCpuBoost: true,
            cpuIdle: true,
          },
          startupProbe: {
            tcpSocket: { port: 3000 },
            periodSeconds: 1,
            failureThreshold: 60,
          },
          commands: ['sh', '-c'],
          args: [
            'cp /etc/scripts/run.sh /tmp/run.sh && cp /etc/litestream/litestream.yml /etc/litestream.yml && chmod +x /tmp/run.sh && /tmp/run.sh',
          ],
          volumeMounts: [
            { name: 'litestream-conf', mountPath: '/etc/litestream' },
            { name: 'litestream-startup-script', mountPath: '/etc/scripts' },
          ],
          envs: [
            { name: 'PORT', value: '3000' },
            { name: 'DB_PATH', value: '/data/blog.sqlite' },
            { name: 'GCS_DATA_BUCKET', value: dataBucket.name },
            { name: 'GCS_MEDIA_BUCKET', value: mediaBucket.name },
            {
              name: 'PAYLOAD_SECRET',
              valueSource: {
                secretKeyRef: {
                  secret: payloadSecretKeySecret.secretId,
                  version: payloadSecretKeySecretVersion.version,
                },
              },
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
