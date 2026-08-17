import path from 'node:path';
import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

// Turbopack resolves loader paths from the project root, so pass an absolute one.
const yamlRawLoader = path.join(process.cwd(), 'scripts/yaml-raw-loader.cjs');

// This config serves two deploy targets from one codebase:
//   - GitHub Pages (default): static export (`output: 'export'`) under the repo
//     subpath, driven by NEXT_PUBLIC_BASE_PATH.
//   - Cloudflare Workers (CF_BUILD=1): rendered by an OpenNext Worker at the
//     domain root, so no static export / basePath / assetPrefix.
const isCloudflare = process.env.CF_BUILD === '1';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  trailingSlash: true,
  turbopack: {
    // Inline YAML files as raw strings at build time (see lib/events.ts). Works
    // for both targets: the Workers runtime has no filesystem, and the static
    // export build has no Node runtime to read files at request time.
    // Turbopack's built-in `type: 'raw'` is not enough here: it emits a
    // non-ECMAScript asset that require.context can't place in an ESM chunk,
    // so we use a tiny local loader that emits a real JS module instead. A
    // `webpack` config here would fail the build outright, since Next 16
    // builds with Turbopack.
    rules: {
      '*.yml': { loaders: [yamlRawLoader], as: '*.js' },
      '*.yaml': { loaders: [yamlRawLoader], as: '*.js' },
    },
  },
  // GitHub Pages only: emit static HTML under the repo subpath.
  ...(isCloudflare
    ? {}
    : {
        output: 'export',
        basePath: basePath || undefined,
        assetPrefix: basePath || undefined,
        env: { NEXT_PUBLIC_BASE_PATH: basePath },
      }),
};

export default nextConfig;

// Makes Cloudflare bindings available during `next dev` — only relevant to the
// Worker target, skipped for the Pages build.
if (isCloudflare) initOpenNextCloudflareForDev();
