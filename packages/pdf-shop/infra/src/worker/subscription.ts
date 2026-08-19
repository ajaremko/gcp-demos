import * as pulumi from '@pulumi/pulumi'
import * as gcp from '@pulumi/gcp'

import {
  deadletterBucketName,
  pubsubServiceAccountIamRoles,
} from '../deadletter'
import { labels, gcpRegion, tag } from '../config'
import { provider, pubsubServiceAccountEmail } from '../project'
import { pubsubService } from '../services'
import { documentOrdersTopicName } from '../data'

import { workerService } from './service'

export const workerInvokerServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-worker-push-sa`,
  {
    accountId: `${tag}-worker-push-sa`,
    displayName: 'Website worker Invoker',
  },
  { provider },
)

const workerInvokerServiceAccountInvoker = new gcp.cloudrunv2.ServiceIamMember(
  `${tag}-worker-push-invoker`,
  {
    name: workerService.name,
    location: gcpRegion,
    role: 'roles/run.invoker',
    member: pulumi.interpolate`serviceAccount:${workerInvokerServiceAccount.email}`,
  },
  { provider },
)

const workerInvokerServiceAccountTokenCreator =
  new gcp.serviceaccount.IAMMember(
    `${tag}-worker-push-token-creator`,
    {
      serviceAccountId: workerInvokerServiceAccount.name,
      role: 'roles/iam.serviceAccountTokenCreator',
      member: pulumi.interpolate`serviceAccount:${workerInvokerServiceAccount.email}`,
    },
    { provider },
  )

// create the deadletter topic to write failed messages to
export const workerDeadletterTopic = new gcp.pubsub.Topic(
  `${tag}-worker-deadletter-topic`,
  { labels: labels },
  { dependsOn: [pubsubService], provider },
)

// grant the pubsub service account permissions to publish
// to the deadletter topic
const pubsubServiceAccountPublisher = new gcp.pubsub.TopicIAMMember(
  `${tag}-pubsub-sa-worker-deadletter-publisher`,
  {
    topic: workerDeadletterTopic.name,
    role: 'roles/pubsub.publisher',
    member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
  },
  { provider },
)

// create the subscription with a deadletter policy that
// sends failed messages to the deadletter topic
export const workerOrdersSubscription = new gcp.pubsub.Subscription(
  `${tag}-orders-subscription`,
  {
    topic: documentOrdersTopicName,
    deadLetterPolicy: {
      deadLetterTopic: workerDeadletterTopic.id,
      maxDeliveryAttempts: 5,
    },
    retryPolicy: {
      minimumBackoff: '10s',
      maximumBackoff: '600s',
    },
    pushConfig: {
      pushEndpoint: pulumi.interpolate`${workerService.uri}`,
      oidcToken: {
        serviceAccountEmail: workerInvokerServiceAccount.email,
      },
      attributes: {
        'x-goog-version': 'v1',
      },
    },
    labels,
  },
  {
    provider,
    dependsOn: [
      ...pubsubServiceAccountIamRoles,
      workerInvokerServiceAccountTokenCreator,
      pubsubServiceAccountPublisher,
      workerInvokerServiceAccountInvoker,
    ],
  },
)

// grant the pubsub service account permissions to access the subscription
const pubsubServiceAccountOrdersSubscriber =
  new gcp.pubsub.SubscriptionIAMMember(
    `${tag}-pubsub-sa-worker-orders-subscriber`,
    {
      subscription: workerOrdersSubscription.name,
      role: 'roles/pubsub.subscriber',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider },
  )

// create a subscription to the deadletter topic that
// writes messages to the deadletter bucket once
// all permissions are in place
export const workerDeadletterTopicArchiveSubscription =
  new gcp.pubsub.Subscription(
    `${tag}-worker-deadletter-archive-subscription`,
    {
      topic: workerDeadletterTopic.name,
      messageRetentionDuration: '604800s', // 7 days
      cloudStorageConfig: {
        bucket: deadletterBucketName,
        filenameDatetimeFormat: 'YYYY/MM/DD/hh_mm_ssZ',
        filenamePrefix: 'worker-deadletter/',
        maxMessages: 1000,
      },
      labels,
    },
    {
      dependsOn: [
        pubsubServiceAccountPublisher,
        pubsubServiceAccountOrdersSubscriber,
        ...pubsubServiceAccountIamRoles,
      ],
      provider,
    },
  )
