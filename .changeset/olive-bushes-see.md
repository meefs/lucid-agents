---
'@lucid-agents/core': minor
'@lucid-agents/http': minor
'@lucid-agents/types': minor
'@lucid-agents/hono': minor
'@lucid-agents/express': minor
'@lucid-agents/tanstack': minor
'@lucid-agents/a2a': minor
'@lucid-agents/ap2': minor
'@lucid-agents/identity': minor
'@lucid-agents/payments': minor
'@lucid-agents/wallet': minor
'@lucid-agents/cli': minor
---

Refactor to protocol-agnostic extension-based architecture with HTTP as separate package

**Breaking Changes:**

- **Extension-based API**: Removed `createAgentRuntime()` and `createAgentHttpRuntime()` - replaced with extension-based API using `createApp().use().build()`
- **HTTP as separate package**: HTTP extension moved to separate `@lucid-agents/http` package
- **Protocol-agnostic core**: `AgentCore` no longer has `invoke()`, `stream()`, or `resolveManifest()` methods - these are HTTP-specific and moved to `@lucid-agents/http`
- **AgentContext is protocol-agnostic**: Removed `headers: Headers` property, replaced with `metadata?: Record<string, unknown>` (HTTP extension adds headers to metadata)
- **ZodValidationError moved**: Moved from `@lucid-agents/core` to `@lucid-agents/types/core`
- **Removed utilities**: Removed `toJsonSchemaOrUndefined()` - inline `z.toJSONSchema()` directly where needed
- **Removed types**: Removed `InvokeContext`, `StreamContext`, and `InvokeResult` from `@lucid-agents/core` - these are HTTP-specific and now in `@lucid-agents/http`
- **All adapters**: Now use `createApp().use(http()).build()` pattern and require HTTP extension

**New API:**

```typescript
import { createApp } from '@lucid-agents/core';
import { http } from '@lucid-agents/http';
import { identity } from '@lucid-agents/identity';
import { payments } from '@lucid-agents/payments';
import { a2a } from '@lucid-agents/a2a';

const runtime = createApp(meta)
  .use(http())
  .use(identity({ trust }))
  .use(payments({ config }))
  .use(a2a())
  .build();
```

**Migration Guide:**

1. **Replace runtime creation:**
   - Old: `createAgentRuntime(meta, options)`
   - New: `createApp(meta).use(extensions).build()`

2. **Replace HTTP runtime:**
   - Old: `createAgentHttpRuntime(meta, options)`
   - New: `createApp(meta).use(http()).build()`

3. **Update imports:**
   - Import `http` from `@lucid-agents/http` instead of `@lucid-agents/core`
   - Import `ZodValidationError` from `@lucid-agents/types/core` instead of `@lucid-agents/core`
   - Import `InvokeResult` from `@lucid-agents/http` instead of `@lucid-agents/core` (if needed)

4. **Update AgentContext usage:**
   - Old: `ctx.headers.get('authorization')`
   - New: `(ctx.metadata?.headers as Headers)?.get('authorization')` or `ctx.metadata?.headers` (HTTP extension provides this)

5. **Update manifest building:**
   - Old: `agent.resolveManifest(origin, basePath)`
   - New: `runtime.manifest.build(origin)`

6. **Remove core invoke/stream calls:**
   - Old: `runtime.agent.invoke(key, input, ctx)`
   - New: Use HTTP handlers or `invokeHandler` from `@lucid-agents/http` for direct calls

7. **Update CLI templates and examples** to use new extension API
