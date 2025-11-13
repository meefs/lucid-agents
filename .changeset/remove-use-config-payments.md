---
'@lucid-agents/core': patch
'@lucid-agents/hono': patch
'@lucid-agents/tanstack': patch
'@lucid-agents/types': patch
'@lucid-agents/payments': patch
'@lucid-agents/cli': patch
---

**BREAKING**: Remove `useConfigPayments` and `defaultPrice` - fully explicit payment configuration

Two breaking changes for clearer, more explicit payment handling:

1. **Removed `useConfigPayments` option** - No more automatic payment application
2. **Removed `defaultPrice` from PaymentsConfig** - Each paid entrypoint must specify its own price

**Migration:**

Before:
```typescript
createAgentApp(meta, {
  config: {
    payments: {
      facilitatorUrl: '...',
      payTo: '0x...',
      network: 'base-sepolia',
      defaultPrice: '1000', //  Removed
    }
  },
  useConfigPayments: true, //  Removed
});

addEntrypoint({
  key: 'analyze',
  // Inherited defaultPrice
  handler: ...
});
```

After:
```typescript
const DEFAULT_PRICE = '1000'; // Optional: define your own constant

createAgentApp(meta, {
  payments: {
    facilitatorUrl: '...',
    payTo: '0x...',
    network: 'base-sepolia',
    //  No defaultPrice
  }
});

addEntrypoint({
  key: 'analyze',
  price: DEFAULT_PRICE, //  Explicit per entrypoint
  handler: ...
});
```

**Benefits:**
- **Fully explicit**: Every paid entrypoint has a visible price
- **No magic defaults**: What you see is what you get
- **Simpler types**: `PaymentsConfig` only has essential fields
- **Developer friendly**: Easy to define your own constants if needed

