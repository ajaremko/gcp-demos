import {
  workerSubmissionSubscription,
  workerDeadletterTopic,
  workerDeadletterTopicArchiveSubscription,
  workerInvokerServiceAccount,
} from './subscription'

export const workerSubscriptionName = workerSubmissionSubscription.name
export const workerDeadletterTopicName = workerDeadletterTopic.name
export const workerDeadletterTopicArchiveSubscriptionName =
  workerDeadletterTopicArchiveSubscription.name
export const workerInvokerServiceAccountEmail =
  workerInvokerServiceAccount.email

import { workerService } from './service'

export const workerServiceName = workerService.name
