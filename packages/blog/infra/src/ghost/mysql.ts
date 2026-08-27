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

const ghostDbUserPassword = new random.RandomPassword(
  `${tag}-ghost-db-user-password`,
  {
    length: 16,
    special: true,
  },
)

export const ghostDbUserPasswordSecret = new gcp.secretmanager.Secret(
  `${tag}-ghost-db-user-password-secret`,
  {
    secretId: 'ghost-db-user-password',
    labels,
    replication: {
      auto: {},
    },
    deletionProtection,
  },
  { provider, dependsOn: secretManagerService },
)

export const ghostDbUserPasswordSecretVersion =
  new gcp.secretmanager.SecretVersion(
    `${tag}-ghost-db-user-password-secret-version`,
    {
      secret: ghostDbUserPasswordSecret.id,
      secretData: ghostDbUserPassword.result,
    },
    { provider },
  )

export const ghostDb = new gcp.sql.Database(
  `${tag}-ghost-db`,
  {
    instance: sharedMysqlInstanceName,
    name: 'ghost_production',
  },
  { provider, dependsOn: [sqlAdminService] },
)

export const ghostDbUser = new gcp.sql.User(
  `${tag}-ghost-db-user`,
  {
    instance: sharedMysqlInstanceName,
    name: 'ghost_user',
    password: ghostDbUserPassword.result,
  },
  { provider },
)
