import { backendService } from './service'

export const websiteServiceName = backendService.name

import { backendDbUserPasswordSecret } from './mysql'

export const backendDbUserPasswordSecretId =
  backendDbUserPasswordSecret.secretId
export const backendDbUserPasswordSecretName = backendDbUserPasswordSecret.name
