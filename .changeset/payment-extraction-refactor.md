---
"@lucid-agents/agent-kit": minor
"@lucid-agents/agent-kit-payments": minor
"@lucid-agents/agent-kit-hono": minor
"@lucid-agents/agent-kit-tanstack": minor
---

# Payment Logic Extraction and Type Reorganization

This release completes the extraction of all payment-related logic from `agent-kit` into `agent-kit-payments`, establishes correct package boundaries, and reorganizes types to be co-located with their features.

## Breaking Changes

### Dependency Structure Clarified

- Extensions (`agent-kit-identity`, `agent-kit-payments`) are now independent of each other
- `agent-kit` depends on both extensions
- `agent-kit-payments` imports `EntrypointDef` from `agent-kit`
- Build order: identity → payments → agent-kit → adapters

### Type Locations Changed

- `EntrypointDef` moved to `agent-kit/src/http/types.ts` - co-located with HTTP types
- Stream types moved to `http/types.ts` - co-located with HTTP/SSE functionality
- Deleted `agent-kit/src/types.ts` - types now co-located with features
- Core types (`AgentMeta`, `AgentContext`, `Usage`) remain in `core/types.ts`
- Crypto utilities (`sanitizeAddress`, `ZERO_ADDRESS`) added to `crypto/address.ts`

### Import Path Changes

**Before:**
```typescript
import type { EntrypointDef } from '@lucid-agents/agent-kit';
```

**After (unchanged):**
```typescript
import type { EntrypointDef } from '@lucid-agents/agent-kit';
```

**For payment types:**
```typescript
import type { PaymentsConfig } from '@lucid-agents/agent-kit-payments';
```

## Architectural Changes

### Files Deleted from agent-kit

- `src/types.ts` - Central types file deleted; types now co-located with features
- `src/http/payments.ts` - Payment requirement logic moved to agent-kit-payments
- `src/runtime.ts` - Runtime payment context moved to agent-kit-payments
- `src/utils/axllm.ts` - Moved to `src/axllm/index.ts`

### Package Boundaries Clarified

**agent-kit-payments** contains ALL x402 protocol code:
- Payment configuration types
- Payment requirement resolution
- 402 response generation
- x402 client utilities (making payments)
- Runtime payment context (wallet integration)
- AxLLM integration with x402

**agent-kit** contains:
- Core types (AgentMeta, AgentContext, Usage)
- HTTP types (EntrypointDef, StreamEnvelope, etc.)
- Core runtime (AgentCore, handlers)
- HTTP runtime and SSE streaming
- Manifest generation
- Config management
- UI landing page
- Crypto utilities (sanitizeAddress)

### AxLLM Reorganization

- Moved from `src/utils/axllm.ts` to `src/axllm/index.ts`
- Rationale: Isolated for future extraction into separate package
- Updated package.json exports: `./axllm` instead of `./utils/axllm`

## Migration Guide

### For Package Consumers

`EntrypointDef` remains in `agent-kit`, so existing imports continue to work:

```typescript
// EntrypointDef stays in agent-kit
import type { EntrypointDef } from '@lucid-agents/agent-kit';

// Payment configuration from agent-kit-payments
import type { PaymentsConfig } from '@lucid-agents/agent-kit-payments';
```

### For Package Contributors

- Types are now co-located with features (no central types file)
- Payment logic belongs in `agent-kit-payments`
- agent-kit-payments must build before agent-kit

## Bug Fixes

### Type Inference for Entrypoint Handlers

**Fixed:** `addEntrypoint()` now properly infers input/output types from Zod schemas.

**Before:**
```typescript
addEntrypoint({
  input: z.object({ message: z.string() }),
  handler: async ({ input }) => {
    // Bug: input has type 'unknown' even with schema
    const msg = input.message; // ❌ Type error
  },
});
```

**After:**
```typescript
addEntrypoint({
  input: z.object({ message: z.string() }),
  handler: async ({ input }) => {
    // Fixed: input has type { message: string }
    const msg = input.message; // ✅ Works!
  },
});
```

**Technical change:** Made `AgentCore.addEntrypoint()` generic to preserve schema type information.

## Testing

- All existing tests pass (114 tests)
- Added 6 new tests for type inference
- Total: **120 tests pass, 0 fail**
- Build succeeds for all packages
- TypeScript type checking passes

## Dependency Structure

```
Independent Extensions:
  - agent-kit-identity (ERC-8004)
  - agent-kit-payments (x402)
         ↓
agent-kit (core runtime + EntrypointDef)
         ↓
agent-kit-hono / agent-kit-tanstack (adapters)
```

