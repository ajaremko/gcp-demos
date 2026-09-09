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
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      sourceMap: true,
      // pino dynamically loads its transport (pino-pretty) via a worker
      // thread at a file path it computes at runtime, which breaks once
      // pino's own module structure is rewritten by webpack bundling -
      // keep it external and let the Dockerfile's `npm install` provide
      // the real package instead (mirrors packages/pdf-shop/worker).
      externalDependencies: ['pino'],
    }),
  ],
}
