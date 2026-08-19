import * as pulumi from '@pulumi/pulumi'

export const stackName = pulumi.getStack()
export const stackSuffix = stackName.toUpperCase()

export const tag = 'shared'

const coreConfig = new pulumi.Config('core')
export const gcpProject = coreConfig.require('project')
export const gcpRegion = coreConfig.require('region')
export const githubOrg = coreConfig.require('githubOrg')
export const githubRepo = coreConfig.require('githubRepo')
export const workloadIdentityPoolId = coreConfig.require(
  'workloadIdentityPoolId',
)

export const coreLabels: Record<string, string> = {
  env: stackName,
  tag,
}
