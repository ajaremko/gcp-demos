import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { provider, gcsAccount } from '../project'
import { tag, labels } from '../config'
import { pubsubService } from '../services'

import { dataBucket } from './storage'

export const documentOrdersTopic = new gcp.pubsub.Topic(
  `${tag}-document-orders-topic`,
  { labels },
  { dependsOn: [pubsubService], provider },
)

const documentOrdersTopicGcsPublisher = new gcp.pubsub.TopicIAMMember(
  `${tag}-document-orders-topic-publisher`,
  {
    topic: documentOrdersTopic.id,
    role: 'roles/pubsub.publisher',
    member: pulumi.interpolate`serviceAccount:${gcsAccount.emailAddress}`,
  },
  { provider },
)

export const documentOrdersStorageUploadNotification =
  new gcp.storage.Notification(
    `${tag}-document-orders-record-notification`,
    {
      bucket: dataBucket.name,
      payloadFormat: 'JSON_API_V1',
      topic: documentOrdersTopic.id,
      eventTypes: ['OBJECT_FINALIZE'],
      objectNamePrefix: '**/created.json',
    },
    {
      provider,
      dependsOn: [documentOrdersTopicGcsPublisher],
    },
  )
