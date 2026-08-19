import * as pulumi from '@pulumi/pulumi'

export const stackName = pulumi.getStack()
export const stackSuffix = stackName.toUpperCase()

export const tag = 'shared'

const config = new pulumi.Config()
export const gcpProject = config.require('project')
export const gcpRegion = config.require('region')
export const githubOrg = config.require('githubOrg')
export const githubRepo = config.require('githubRepo')
export const workloadIdentityPoolId = config.require('workloadIdentityPoolId')

export const coreLabels: Record<string, string> = {
  env: stackName,
  tag,
}
