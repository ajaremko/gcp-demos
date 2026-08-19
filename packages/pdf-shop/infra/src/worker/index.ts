import {
  workerOrdersSubscription,
  workerDeadletterTopic,
  workerDeadletterTopicArchiveSubscription,
  workerInvokerServiceAccount,
} from './subscription'

export const workerSubscriptionName = workerOrdersSubscription.name
export const workerDeadletterTopicName = workerDeadletterTopic.name
export const workerDeadletterTopicArchiveSubscriptionName =
  workerDeadletterTopicArchiveSubscription.name
export const workerInvokerServiceAccountEmail =
  workerInvokerServiceAccount.email

import { workerService } from './service'

export const workerServiceName = workerService.name
