import { websiteService } from './service'

export const websiteServiceUrl = websiteService.statuses[0].url
export const websiteServiceName = websiteService.name

import { stripeSecretKey } from './stripe'

export const stripeSecretKeySecretId = stripeSecretKey.secretId
export const stripeSecretKeyName = stripeSecretKey.name

import { documentOrdersTopic } from './topic'

export const documentOrdersTopicName = documentOrdersTopic.name
