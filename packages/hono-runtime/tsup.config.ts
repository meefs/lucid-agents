import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/runtime/workers/js-worker.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  tsconfig: './tsconfig.build.json',
  external: [
    'hono',
    '@hono/zod-openapi',
    '@hono/swagger-ui',
    'zod',
  ],
});
