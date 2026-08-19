import * as pulumi from '@pulumi/pulumi'

export const stackName = pulumi.getStack()
export const stackSuffix = stackName.toUpperCase()

export const tag = 'pdf-shop'

const config = new pulumi.Config()
export const gcpProject = config.require('project')
export const gcpRegion = config.require('region')
export const websiteImageTag = config.require('websiteImageTag')
export const workerImageTag = config.require('workerImageTag')
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
