import * as pulumi from '@pulumi/pulumi'

export const stackName = pulumi.getStack()
export const stackSuffix = stackName.toUpperCase()

export const tag = 'pdf-shop'

const config = new pulumi.Config()
export const gcpProject = config.require('project')
export const gcpRegion = config.require('region')

export const coreLabels: Record<string, string> = {
  env: stackName,
  tag,
}
