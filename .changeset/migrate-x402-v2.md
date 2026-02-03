---
"@lucid-agents/payments": minor
---

Migrate to @x402/* packages (v2) for x402 protocol support

**Breaking change**: Replaced legacy `x402` and `x402-fetch` packages with new `@x402/*` packages:
- `@x402/core` - Core x402 protocol types
- `@x402/fetch` - Payment-wrapped fetch with `wrapFetchWithPayment` and `x402Client`
- `@x402/evm` - EVM signer support with `ExactEvmScheme` and `toClientEvmSigner`

**Why**: The server returns x402 v2 protocol format with CAIP-2 network identifiers (e.g., `eip155:8453`)
which the legacy packages don't support. The new @x402/* packages handle this correctly.

**Migration guide for raw x402 usage**:

Before:
```typescript
import { wrapFetchWithX402, createWallet } from 'x402-fetch';
const wallet = createWallet(privateKey, 'base');
const x402Fetch = wrapFetchWithX402(fetch, wallet);
```

After:
```typescript
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { ExactEvmScheme, toClientEvmSigner } from '@x402/evm';
import { privateKeyToAccount } from 'viem/accounts';

const account = privateKeyToAccount(privateKey);
const signer = toClientEvmSigner(account);
const client = new x402Client()
  .register('eip155:8453', new ExactEvmScheme(signer));  // Base
const x402Fetch = wrapFetchWithPayment(fetch, client);
```

**No changes needed** if you use the `createX402Fetch` and `accountFromPrivateKey` helpers -
they now use the new packages internally.

Supported networks:
- `eip155:8453` - Base mainnet
- `eip155:84532` - Base Sepolia
- `eip155:1` - Ethereum mainnet
- `eip155:11155111` - Ethereum Sepolia
