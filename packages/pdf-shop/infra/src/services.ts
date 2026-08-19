import * as gcp from '@pulumi/gcp'

import { tag } from './config'
import { provider } from './project'

export const computeService = new gcp.projects.Service(
  `${tag}-compute-service`,
  {
    service: 'compute.googleapis.com',
  },
  { provider }
)

export const resourceManagerService = new gcp.projects.Service(
  `${tag}-resource-manager-service`,
  {
    service: 'cloudresourcemanager.googleapis.com',
  },
  { provider }
)

export const artifactRegistryService = new gcp.projects.Service(
  `${tag}-artifact-registry-service`,
  {
    service: 'artifactregistry.googleapis.com',
  },
  { provider, dependsOn: [computeService, resourceManagerService] }
)

export const cloudRunService = new gcp.projects.Service(
  `${tag}-cloud-run-service`,
  {
    service: 'run.googleapis.com',
  },
  { provider }
)

export const domainsService = new gcp.projects.Service(
  `${tag}-domains-service`,
  {
    service: 'domains.googleapis.com',
  },
  { provider }
)

export const dnsService = new gcp.projects.Service(
  `${tag}-dns-service`,
  {
    service: 'dns.googleapis.com',
  },
  { provider }
)

export const siteVerificationService = new gcp.projects.Service(
  `${tag}-siteverification-service`,
  {
    service: 'siteverification.googleapis.com',
  },
  { provider }
)

export const storageService = new gcp.projects.Service(
  `${tag}-storage-service`,
  {
    service: 'storage.googleapis.com',
  },
  { provider }
)

export const pubsubService = new gcp.projects.Service(
  `${tag}-pubsub-service`,
  {
    service: 'pubsub.googleapis.com',
  },
  { provider }
)

export const secretManagerService = new gcp.projects.Service(
  `${tag}-secret-manager-service`,
  {
    service: 'secretmanager.googleapis.com',
  },
  { provider }
)

export const recaptchaService = new gcp.projects.Service(
  `${tag}-recaptcha-service`,
  {
    service: 'recaptchaenterprise.googleapis.com',
  },
  { provider }
)
