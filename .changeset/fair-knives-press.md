---
"@lucid-dreams/agent-kit-identity": major
"@lucid-dreams/agent-kit": patch
---

# Complete Rewrite for ERC-8004 v1.0 Specification

## Breaking Changes

This is a **complete rewrite** of `@lucid-dreams/agent-kit-identity` to properly implement the ERC-8004 v1.0 specification.

### What Changed

**Fixed Critical Issues:**

- ✅ Now uses the actual ERC-8004 v1.0 contract ABI (was using incorrect/non-existent functions)
- ✅ Properly parses `Registered` event to extract `agentId` from transaction receipts
- ✅ Removed "synthetic trust" logic that generated fake identity data
- ✅ Auto-adds `0x` prefix to private keys for better DX

**New Recommended API:**

- Use `createAgentIdentity({ autoRegister: true })` instead of `bootstrapIdentity()`
- Use `getTrustConfig(identity)` helper to extract trust config
- Use `registerAgent()` for explicit registration

**Removed:**

- Non-existent contract functions: `New()`, `Update()`, `ResolveByDomain()`, `ResolveByAddress()`
- Synthetic trust fallback behavior
- `fallback` parameter from bootstrap functions

### Migration Guide

**Before (old API):**

```ts
import { bootstrapIdentity } from "@lucid-dreams/agent-kit";

const identity = await bootstrapIdentity({
  domain: "agent.example.com",
  registerIfMissing: true,
  fallback: { address: "0x..." },
});
```

**After (new API):**

```ts
import {
  createAgentIdentity,
  getTrustConfig,
} from "@lucid-dreams/agent-kit-identity";

const identity = await createAgentIdentity({
  domain: "agent.example.com",
  autoRegister: true,
});

// Use in your agent
const { app } = createAgentApp(meta, {
  trust: getTrustConfig(identity),
});
```

### Contract Details

- **Identity Registry**: `0x7177a6867296406881E20d6647232314736Dd09A` (deterministic on all chains)
- **Metadata URI**: `https://{domain}/.well-known/agent-metadata.json`
- **Supported Networks**: Base Sepolia (84532)

### Updated Dependencies

- `agent-kit` examples now use the new `createAgentIdentity` API
- `agent-kit` README updated to recommend the new API
