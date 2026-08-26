import * as gcp from '@pulumi/gcp'

import { tag } from './config'
import { provider } from './project'
import { sqlAdminService } from './services'

export const mysqlInstance = new gcp.sql.DatabaseInstance(
  `${tag}-mysql-instance`,
  {
    databaseVersion: 'MYSQL_8_0',
    settings: {
      tier: 'db-f1-micro',
    },
    deletionProtection: false,
  },
  { provider, dependsOn: [sqlAdminService] },
)
