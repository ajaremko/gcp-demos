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
  # Media is streamed out of the (private) GCS bucket by Payload itself, so
  # every uncached view costs the admin container a multi-MB proxied read.
  # Payload sends an ETag but no Cache-Control, so browsers revalidate at
  # best. Deliberately not 'immutable'/1y: Payload keeps the uploader's
  # original filename, so re-uploading under the same name must not be
  # permanently stale - an hour, then the existing ETag makes revalidation
  # a cheap 304. The server-level proxy_* directives above are inherited.
  location ^~ /api/media/file/ {
    proxy_pass http://127.0.0.1:3000;
    add_header Cache-Control "public, max-age=3600, stale-while-revalidate=86400";
  }
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
 *
 * `snapshot.interval` is 1h rather than litestream's 24h default, and that is
 * a cold-start setting, not a durability one. A restore fetches the newest L9
 * snapshot plus every increment written since it - measured at 1 snapshot +
 * 14 increments on the 24h default, where the increments were ~2.8s of a ~5s
 * restore and the snapshot itself was nearly free. Snapshotting hourly keeps
 * that tail short. Everything else stays default: L1/L2/L3 at 30s/5m/1h, and
 * snapshot retention at 24h, which is what bounds point-in-time recovery -
 * don't shorten that one to "match".
 *
 * Note the cadence is a ceiling, not a promise: snapshots are taken by a
 * running instance, and this service scales to zero. In practice a start that
 * finds the snapshot older than an hour takes a fresh one, which is exactly
 * the case worth covering.
 */
const litestreamConfData = dataBucket.name.apply(
  (name) => `
snapshot:
  interval: 1h
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
 *
 * The migrate step's `--disable-transpile` requires a prebuilt JS config,
 * which the image supplies via PAYLOAD_CONFIG_PATH - so this line and
 * blog-admin's `scripts/build-config.mjs` move together. Without it the
 * CLI transpiles the whole config through tsx on every cold start. See
 * blog-admin's RUNBOOK.md, "What's in the image".
 *
 * The migrate step is guarded by `needs-migrate.mjs` because it is a full
 * Node + Payload boot (sharp, lexical, the drizzle schema, opening SQLite)
 * even when it has nothing to apply - which, on every cold start but a
 * post-deploy one, is the case. The guard reads the migrations table with
 * `node:sqlite` and reports "migrate" on anything it can't establish, so a
 * pending migration is never skipped. See that script's header.
 */
const litestreamStartupScript = dataBucket.name.apply(
  (name) => `
#!/bin/sh
echo "Running with ${litestreamConfPath}:"
cat ${litestreamConfPath}
set -e
mkdir -p ${litestreamDataDir}

# Stage markers for apportioning cold-start time. The deltas are whole
# seconds on purpose: BusyBox's date silently ignores %N (in node:22-alpine,
# 'date +%s%3N' prints exactly the same digits as 'date +%s'), so there is no
# millisecond clock here to use. For finer resolution read the Cloud Logging
# timestamps on the [startup] lines themselves.
startup_began=$(date +%s)
stage() { echo "[startup] +$(( $(date +%s) - startup_began ))s $1"; }

stage "litestream restore"
litestream restore -if-replica-exists -o ${litestreamDbPath} "gs://${name}/blog.sqlite"

# 'if' conditions are exempt from set -e, so a guard that exits non-zero
# ("skip") doesn't take the container down with it.
stage "checking for pending migrations"
if node --experimental-sqlite --disable-warning=ExperimentalWarning packages/blog/admin/scripts/needs-migrate.mjs; then
  stage "payload migrate"
  node node_modules/payload/bin.js migrate --disable-transpile
fi

stage "litestream replicate + next server"
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
        // Cloud Run derives the instance's CPU from the sum of the
        // containers' limits, and only accepts certain totals - so these
        // three are chosen together, not independently:
        //   gateway 0.25 + website 0.75 + admin 1 = 2 vCPU.
        // Changing any one of them means re-checking the sum still lands on
        // a supported value, or the revision is rejected at deploy time.
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
          // This container previously declared no resources at all, so it
          // got neither an explicit CPU share nor startup boost while
          // competing with the admin container's Node boots. See the note on
          // the instance CPU total above the gateway container.
          resources: {
            limits: { cpu: '0.75', memory: '512Mi' },
            startupCpuBoost: true,
            cpuIdle: true,
          },
          // Deliberately still a TCP check, unlike the admin container's.
          // Probing '/' would force an SSR render, which fetches the admin
          // API - and this container has no `dependsOns` on 'admin', so
          // during parallel startup that request would 502 and fail the
          // probe. Making it wait for admin would serialise
          // admin -> website -> gateway, which is a worse trade unless the
          // website's cold render actually turns out to dominate.
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
          // 512Mi, not 1Gi: measured peak memory utilization is 26-34%, so the
          // larger limit was billed for nothing. Raising it was tried as a
          // cold-start fix and changed startup latency by zero - see
          // blog-admin's RUNBOOK.md, "Measured vs. assumed", before trying it
          // again.
          resources: {
            limits: { cpu: '1', memory: '512Mi' },
            startupCpuBoost: true,
            cpuIdle: true,
          },
          // httpGet against /healthz, not a TCP check on 3000: Next's
          // standalone server binds the port before it has loaded a single
          // route module, so a tcpSocket probe passes while Payload is still
          // completely uninitialised. Cloud Run then declares the instance
          // ready and the *user's* first request pays for the route module
          // load, the drizzle schema build and the SQLite open - outside the
          // startup window, so without startupCpuBoost. /healthz awaits
          // getPayload(), moving that init in here.
          //
          // periodSeconds/timeoutSeconds are 1, not 2. An earlier version set
          // both to 2 on the theory that an attempt starting mid-init would
          // block until init finished and pass - it doesn't. timeoutSeconds
          // abandons the in-flight attempt, so this is plain polling and the
          // period is purely detection granularity: whatever it is, that's
          // how long the container can sit ready without Cloud Run noticing.
          // Measured on revision 00014, the probe passed "after 4 attempts"
          // with a ~1s gap between Payload finishing and the probe seeing it.
          //
          // Init still spans many attempts, and that's fine: getPayload()
          // memoises on globalThis, so the abandoned ones all fold into the
          // single initialisation already in flight rather than starting new
          // ones. failureThreshold 60 keeps the total budget at 60s.
          startupProbe: {
            httpGet: { path: '/healthz', port: 3000 },
            periodSeconds: 1,
            timeoutSeconds: 1,
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
