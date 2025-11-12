---
'@lucid-agents/create-agent-kit': patch
---

# Fix TanStack Adapter Import Resolution

Resolves module resolution errors in TanStack adapter templates on clean installs.

## Summary

TanStack adapter routes were importing from `@/agent` but the agent file was located at `src/lib/agent.ts`, causing "cannot be resolved" errors during Vite dependency scanning. Updated all imports to use `@/lib/agent` for consistency with other adapters.

## Changes

### Updated Import Paths

All TanStack route files (both UI and headless) now import from `@/lib/agent`:

- `src/routes/index.tsx`
- `src/routes/api/agent/entrypoints.ts`
- `src/routes/api/agent/entrypoints/$key/invoke.ts`
- `src/routes/api/agent/entrypoints/$key/stream.ts`
- `src/routes/api/agent/health.ts`
- `src/routes/api/agent/manifest.ts`
- `src/routes/[.]well-known/agent-card[.]json.ts`
- `src/lib/dashboard-loader.ts`

**Before:**
```typescript
const { agent } = await import('@/agent');
```

**After:**
```typescript
const { agent } = await import('@/lib/agent');
```

### Consistent Directory Structure

All adapters now use consistent `lib/` directory structure:

- **Hono**: `src/lib/agent.ts` → `./lib/agent`
- **Next.js**: `lib/agent.ts` → `@/lib/agent`
- **TanStack UI**: `src/lib/agent.ts` → `@/lib/agent` ✓
- **TanStack Headless**: `src/lib/agent.ts` → `@/lib/agent` ✓

## Backward Compatibility

This only affects newly scaffolded projects. Existing TanStack projects are unaffected.

