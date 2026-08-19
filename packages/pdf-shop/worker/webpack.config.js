const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin')
const { join } = require('path')

module.exports = {
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      optimization: false,
      outputHashing: 'none',
      sourceMap: true,
      // Bundle the workspace package (@org/pdf-shop-application) directly
      // into the output — it has no npm registry entry, so it can't be
      // `npm install`'d in the Docker image the way a real dependency can.
      // Keep real npm packages external instead of also bundling them:
      // pino dynamically loads its transport (pino-pretty) via a worker
      // thread at a file path it computes at runtime, which breaks once
      // pino's own module structure is rewritten by webpack bundling —
      // confirmed directly (`nx test pdf-shop-worker-e2e` failed against a
      // fully-bundled build). `tslib` is needed too, since it's a real
      // dependency of the now-bundled @org/pdf-shop-application. The
      // Dockerfile installs these 3 itself from package.json, so no
      // generated package.json is needed here.
      externalDependencies: ['express', 'pino', 'tslib'],
      generatePackageJson: false,
    }),
  ],
}
