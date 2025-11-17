import { definePackageConfig } from '../tsup.config.base';

export default definePackageConfig({
  entry: ['src/index.ts', 'src/core/index.ts', 'src/identity/index.ts', 'src/payments/index.ts', 'src/wallets/index.ts'],
  dts: {
    entry: ['src/index.ts', 'src/core/index.ts', 'src/identity/index.ts', 'src/payments/index.ts', 'src/wallets/index.ts'],
  },
  external: ['zod', 'x402'],
});

