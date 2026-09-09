import * as gcp from '@pulumi/gcp'

import { tag } from './config'
import { provider } from './project'

export const htmlGfxServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-sa`,
  {
    accountId: `${tag}-sa`,
    displayName: 'HTML GFX Service Account',
  },
  { provider },
)

export const iamBindings = []
