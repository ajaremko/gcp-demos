import * as random from '@pulumi/random'
import * as gcp from '@pulumi/gcp'

import {
  tag,
  labels,
  deletionProtection,
  sharedMysqlInstanceName,
} from '../config'
import { sqlAdminService, secretManagerService } from '../services'
import { provider } from '../project'

const backendDbUserPassword = new random.RandomPassword(
  `${tag}-backend-db-user-password`,
  {
    length: 16,
    special: true,
  },
)

export const backendDbUserPasswordSecret = new gcp.secretmanager.Secret(
  `${tag}-backend-db-user-password-secret`,
  {
    secretId: 'backend-db-user-password',
    labels,
    replication: {
      auto: {},
    },
    deletionProtection,
  },
  { provider, dependsOn: secretManagerService },
)

export const backendDbUserPasswordSecretVersion =
  new gcp.secretmanager.SecretVersion(
    `${tag}-backend-db-user-password-secret-version`,
    {
      secret: backendDbUserPasswordSecret.id,
      secretData: backendDbUserPassword.result,
    },
    { provider },
  )

export const backendDb = new gcp.sql.Database(
  `${tag}-backend-db`,
  {
    instance: sharedMysqlInstanceName,
    name: 'ghost_production',
  },
  { provider, dependsOn: [sqlAdminService] },
)

export const backendDbUser = new gcp.sql.User(
  `${tag}-backend-db-user`,
  {
    instance: sharedMysqlInstanceName,
    name: 'ghost_user',
    password: backendDbUserPassword.result,
  },
  { provider },
)
