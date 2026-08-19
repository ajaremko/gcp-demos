export * from './website'
export * from './worker'

export { gcpProject, gcpRegion } from './config'

import { dataBucket } from './storage'

export const dataBucketName = dataBucket.name

import { documentOrdersTopic } from './topic'

export const documentOrdersTopicName = documentOrdersTopic.name
