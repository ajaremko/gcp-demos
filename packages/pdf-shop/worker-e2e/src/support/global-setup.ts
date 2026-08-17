import { waitForPortOpen, killPort } from '@nx/node/utils'

export default async function () {
  console.log('\nSetting up...\n')
  const host = process.env.HOST ?? 'localhost'
  const port = process.env.PORT ? Number(process.env.PORT) : 3333
  await waitForPortOpen(port, { host })

  return async () => {
    console.log('\nTearing down...\n')
    await killPort(port)
  }
}
