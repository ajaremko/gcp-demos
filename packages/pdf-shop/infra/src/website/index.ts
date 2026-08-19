import { websiteService } from './service'

export const websiteServiceUrl = websiteService.statuses[0].url
export const websiteServiceName = websiteService.name

import { stripeSecretKeySecret } from './stripe'

export const stripeSecretKeySecretId = stripeSecretKeySecret.secretId
export const stripeSecretKeySecretName = stripeSecretKeySecret.name

import { documentOrdersTopic } from './topic'

export const documentOrdersTopicName = documentOrdersTopic.name
