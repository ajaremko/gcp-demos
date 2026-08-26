import * as pulumi from '@pulumi/pulumi'

export const stackName = pulumi.getStack()
export const stackSuffix = stackName.toUpperCase()

export const tag = 'blog'

const config = new pulumi.Config()
export const gcpProject = config.require('project')
export const gcpRegion = config.require('region')
export const backendImageTag = config.require('backendImageTag')
export const deletionProtection = config.requireBoolean('deletionProtection')
export const stripeSecretKeySecretVersion = config.get(
  'stripeSecretKeySecretVersion',
)

export const labels: Record<string, string> = {
  env: stackName,
  tag,
}

const sharedStackName = config.require('sharedStackName')
// Format: <organization>/<project>/<stack>
const sharedStackRef = new pulumi.StackReference(
  `${sharedStackName}/${stackName}`,
)

export const sharedProject = sharedStackRef.getOutput('gcpProject')
export const sharedRegion = sharedStackRef.getOutput('gcpRegion')
export const sharedMysqlInstanceName =
  sharedStackRef.getOutput('mysqlInstanceName')
export const sharedMysqlInstanceFirstIpAddress = sharedStackRef.getOutput(
  'mysqlInstanceFirstIpAddress',
)
export const sharedMysqlInstanceId = sharedStackRef.getOutput('mysqlInstanceId')

// Retrieve exported artifact registry details
export const artifactRegistryLocation = sharedStackRef.getOutput(
  'artifactRegistryLocation',
)
export const artifactRegistryName = sharedStackRef.getOutput(
  'artifactRegistryName',
)
export const artifactRegistryRepositoryId = sharedStackRef.getOutput(
  'artifactRegistryRepositoryId',
)
