import * as gcp from '@pulumi/gcp'

import { tag, gcpRegion, gcpProject } from './config'
import { provider } from './project'
import { sqlAdminService } from './services'

export const mysqlInstance = new gcp.sql.DatabaseInstance(
  `${tag}-mysql-instance`,
  {
    databaseVersion: 'MYSQL_8_0',
    region: gcpRegion,
    settings: {
      tier: 'db-f1-micro',
    },
    deletionProtection: false,
  },
  { provider, dependsOn: [sqlAdminService] },
)

export const mysqlInstanceId = mysqlInstance.name.apply(
  (name) => `${gcpProject}:${gcpRegion}:${name}`,
)
