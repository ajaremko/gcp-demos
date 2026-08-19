import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { gcpProject, githubOrg, githubRepo, tag } from '../config'
import { identityPool } from '../identity-pool'
import { provider } from '../project'

/**
 * The service account to be impersonated by GitHub Actions runner to access GCP resources
 */
export const githubActionServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-github-actions-service-account`,
  {
    accountId: 'github-actions-sa',
    displayName: 'GitHub Actions Service Account',
    description: 'Service account for GitHub Actions to access GCP resources',
  },
  { provider }
)

/**
 * The binding that allows the GitHub Actions runner to impersonate the service account
 */
export const githubActionServiceAccountBinding =
  new gcp.serviceaccount.IAMMember(
    `${tag}-github-actions-service-account-workload-id-user-binding`,
    {
      serviceAccountId: githubActionServiceAccount.name,
      role: 'roles/iam.workloadIdentityUser',
      member: pulumi.interpolate`principalSet://iam.googleapis.com/${identityPool.name}/attribute.repository/${githubOrg}/${githubRepo}`,
    },
    { provider }
  )

/**
 * The binding that allows the GitHub Actions runner to create tokens for the service account
 */
export const githubActionTokenCreatorServiceAccountBinding =
  new gcp.serviceaccount.IAMMember(
    `${tag}-github-actions-token-creator`,
    {
      serviceAccountId: githubActionServiceAccount.name,
      role: 'roles/iam.serviceAccountTokenCreator',
      member: pulumi.interpolate`principalSet://iam.googleapis.com/${identityPool.name}/attribute.repository/${githubOrg}/${githubRepo}`,
    },
    { provider }
  )

/**
 * Broadly allow GitHub Actions service account to act as editor on the project.
 * This could be constrained further based on the specific needs of the project.
 */
export const githubActionServiceAccountEditorIamMember =
  new gcp.projects.IAMMember(
    `${tag}-github-actions-service-account-editor-iam-member`,
    {
      project: gcpProject,
      role: 'roles/editor',
      member: pulumi.interpolate`serviceAccount:${githubActionServiceAccount.email}`,
    },
    { dependsOn: [githubActionServiceAccount], provider }
  )

/**
 * Allow GitHub Actions service account to enable cloud services.
 */
export const githubActionServiceAccountServiceAdminIamMember =
  new gcp.projects.IAMMember(
    `${tag}-github-actions-service-account-serviceusage-admin-iam-member`,
    {
      project: gcpProject,
      role: 'roles/serviceusage.serviceUsageAdmin',
      member: pulumi.interpolate`serviceAccount:${githubActionServiceAccount.email}`,
    },
    { dependsOn: [githubActionServiceAccount], provider }
  )

export const githubActionServiceAccountIamAdminIamMember =
  new gcp.projects.IAMMember(
    `${tag}-github-actions-service-account-iam-admin-iam-member`,
    {
      project: gcpProject,
      role: 'roles/iam.serviceAccountAdmin',
      member: pulumi.interpolate`serviceAccount:${githubActionServiceAccount.email}`,
    },
    { dependsOn: [githubActionServiceAccount], provider }
  )

export const githubActionServiceAccountComputeIamMember =
  new gcp.projects.IAMMember(
    `${tag}-github-actions-service-account-compute-admin-iam-member`,
    {
      project: gcpProject,
      role: 'roles/compute.admin',
      member: pulumi.interpolate`serviceAccount:${githubActionServiceAccount.email}`,
    },
    { dependsOn: [githubActionServiceAccount], provider }
  )

/**
 * Broadly allow GitHub Actions service account to act as admin of Cloud KMS.
 * This could be constrained further based on the specific needs of the project.
 */
export const githubActionServiceAccountKmsAdminIamMember =
  new gcp.projects.IAMMember(
    `${tag}-github-actions-service-account-kms-admin-iam-member`,
    {
      project: gcpProject,
      role: 'roles/cloudkms.admin',
      member: pulumi.interpolate`serviceAccount:${githubActionServiceAccount.email}`,
    },
    { dependsOn: [githubActionServiceAccount], provider }
  )
