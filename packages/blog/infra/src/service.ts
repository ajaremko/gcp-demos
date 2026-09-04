import * as gcp from '@pulumi/gcp'

import {
  gcpRegion,
  websiteImageTag,
  adminImageTag,
  tag,
  deletionProtection,
} from './config'
import { cloudRunService } from './services'
import { provider } from './project'
import { getImageUrl } from './getImageUrl'
import { cloudRunArtifactRegistryReader } from './iam'

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

/**
 * Nginx configuration for routing between the admin interface (Nextjs)
 * and the public website (Astro).
 */
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

const litestreamDataDir = '/data'
/**
 * Path to the SQLite database file used by Payload and replicated by Litestream.
 */
const litestreamDbPath = `${litestreamDataDir}/blog.sqlite`

const litestreamConfDir = '/etc/litestream'
const litestreamConfPath = `${litestreamConfDir}/litestream.yml`

/**
 * Litestream configuration for replicating the SQLite database to
 * Google Cloud Storage.
 */
const litestreamConfData = dataBucket.name.apply(
  (name) => `
dbs:
  - path: ${litestreamDbPath}
    replica:
      type: gs
      bucket: ${name}
      path: blog.sqlite
`,
)

const litestreamConfSecretVersion =
  makeLitestreamConfSecretVersion(litestreamConfData)

/**
 * Startup script for initializing Litestream, running Payload migrations and
 * starting the server.
 */
const litestreamStartupScript = dataBucket.name.apply(
  (name) => `
#!/bin/sh
echo "Running with ${litestreamConfPath}:"
cat ${litestreamConfPath}
set -e
mkdir -p ${litestreamDataDir}
echo "Running litestream restore:"
litestream restore -if-replica-exists -o ${litestreamDbPath} "gs://${name}/blog.sqlite"
echo "Running payload migrate:"
npx payload migrate
echo "Running litestream replicate:"
exec litestream replicate -config ${litestreamConfPath} -exec "node packages/blog/admin/server.js"
`,
)

const litestreamStartupScriptSecretVersion =
  makeLitestreamStartupScriptSecretVersion(litestreamStartupScript)

export const blogService = new gcp.cloudrunv2.Service(
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
          dependsOns: ['website', 'admin'],
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
            { name: 'ADMIN_API_URL', value: 'http://127.0.0.1:3000' },
            {
              name: 'LOG_LEVEL',
              value: 'info',
            },
          ],
        },
        {
          name: 'admin',
          image: getImageUrl('blog-admin', adminImageTag),
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
            'cp /scripts/run.sh /tmp/run.sh && chmod +x /tmp/run.sh && /tmp/run.sh',
          ],
          volumeMounts: [
            { name: 'litestream-conf', mountPath: litestreamConfDir },
            { name: 'litestream-startup-script', mountPath: '/scripts' },
          ],
          envs: [
            { name: 'PORT', value: '3000' },
            { name: 'DB_PATH', value: litestreamDbPath },
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

export const blogServicePublicAccess = new gcp.cloudrunv2.ServiceIamMember(
  `${tag}-service-public-access`,
  {
    name: blogService.name,
    location: gcpRegion,
    role: 'roles/run.invoker',
    member: 'allUsers',
  },
  { provider },
)
