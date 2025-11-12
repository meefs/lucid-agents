---
"@lucid-agents/agent-kit-payments": patch
"@lucid-agents/agent-kit": patch
---

Break circular dependency between agent-kit and agent-kit-payments using structural typing

**Breaking Changes:**

- Crypto utilities moved from `@lucid-agents/agent-kit` to `@lucid-agents/agent-kit-payments`
  - `sanitizeAddress`, `normalizeAddress`, `ZERO_ADDRESS`, `Hex` type now exported from agent-kit-payments
  - Update imports: `import { sanitizeAddress } from '@lucid-agents/agent-kit-payments'`

- `resolveEntrypointPrice` renamed to `resolvePrice` in agent-kit-payments
  - More generic function name reflecting that it works with any priceable entity
  - Update calls: `resolvePrice(entity, payments, 'invoke')`

- `paymentsFromEnv` now accepts optional config overrides parameter
  - Enables dependency injection pattern
  - Usage: `paymentsFromEnv(configOverrides)`

**Improvements:**

- Zero circular dependencies (strict DAG architecture)
- agent-kit-payments is now completely independent (leaf package)
- Clearer, more self-documenting code with if/else structures
- Generic `resolvePrice` function eliminates code duplication
- Structural typing pattern documented in ARCHITECTURE.md

**Migration Guide:**

1. Update crypto utility imports:
```typescript
// Before
import { sanitizeAddress, ZERO_ADDRESS } from '@lucid-agents/agent-kit';

// After
import { sanitizeAddress, ZERO_ADDRESS } from '@lucid-agents/agent-kit-payments';
```

2. Update function names:
```typescript
// Before
import { resolveEntrypointPrice } from '@lucid-agents/agent-kit-payments';
const price = resolveEntrypointPrice(entrypoint, payments, 'invoke');

// After
import { resolvePrice } from '@lucid-agents/agent-kit-payments';
const price = resolvePrice(entrypoint, payments, 'invoke');
```

3. Pass config to paymentsFromEnv if using agent-kit config system:
```typescript
// Before
const payments = paymentsFromEnv();

// After (when using agent-kit config)
import { getActiveInstanceConfig, getAgentKitConfig } from '@lucid-agents/agent-kit';
const activeConfig = getActiveInstanceConfig();
const { payments: configPayments } = getAgentKitConfig(activeConfig);
const payments = paymentsFromEnv(configPayments);

// Or for simple env-only usage
const payments = paymentsFromEnv();  // Still works with no args
```

