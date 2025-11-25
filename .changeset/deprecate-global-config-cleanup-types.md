---
"@lucid-agents/core": minor
"@lucid-agents/types": minor
"@lucid-agents/payments": minor
"@lucid-agents/http": minor
"@lucid-agents/wallet": minor
"@lucid-agents/identity": minor
---

Deprecate global config, cleanup types to their respective domains, and add examples package

## Summary

Deprecates global configuration in favor of explicit instance-based configuration passed directly to extensions via `.use()` method. Reorganizes types into domain-specific sub-packages. Adds new `@lucid-agents/examples` package for comprehensive type checking and developer experience validation.

## Breaking Changes

### Configuration API

**Deprecated:** Global configuration pattern with `build(configOverrides)`

**New:** Configuration passed directly to extensions

**Before:**
```typescript
const runtime = await createAgent(meta)
  .use(http())
  .use(payments())
  .build(configOverrides); // Config passed separately
```

**After:**
```typescript
const runtime = await createAgent(meta)
  .use(http())
  .use(payments({ config: paymentsConfig })) // Config passed directly
  .build(); // No arguments
```

### Type Exports

Types reorganized into domain-specific sub-packages. Import directly from `@lucid-agents/types/{domain}`:

- `@lucid-agents/types/core` - Core runtime types
- `@lucid-agents/types/http` - HTTP-related types
- `@lucid-agents/types/payments` - Payment configuration types
- `@lucid-agents/types/wallets` - Wallet types
- `@lucid-agents/types/a2a` - A2A protocol types
- `@lucid-agents/types/ap2` - AP2 extension types

**Migration:**
```typescript
// Before
import { AgentRuntime } from '@lucid-agents/core';

// After
import type { AgentRuntime } from '@lucid-agents/types/core';
```

## Improvements

- **New Examples Package (`@lucid-agents/examples`)**: Added comprehensive examples package that serves as critical infrastructure for maintaining developer experience quality
  - Provides continuous type checking to ensure developer-facing interfaces remain stable
  - Validates developer experience consistency when pushing SDK changes
  - Eliminates circular development dependencies by moving examples out of individual packages
  - Ensures all SDK packages work correctly together before releases
  - Marked as private package (not published to npm) for internal use
- Better type inference for entrypoint handlers with Zod-aware generics
- Reorganized HTTP/fetch typings for clearer server/client usage
- Eliminated circular dependencies by moving shared types to `@lucid-agents/types`
- Fixed build order based on actual runtime dependencies

## Bug Fixes

- Fixed incorrect `https://` protocol in Bun server log messages (changed to `http://`)
- Fixed `facilitatorUrl` type mismatch in payments configuration (now uses proper `Resource` type with URL validation)

