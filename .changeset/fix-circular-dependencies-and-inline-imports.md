---
"@lucid-agents/http": patch
"@lucid-agents/payments": patch
"@lucid-agents/types": patch
"@lucid-agents/identity": patch
---

Fix circular dependencies and inline type imports

- **HTTP package**: Removed circular dependencies on `@lucid-agents/core` and `@lucid-agents/payments` by exposing `resolvePrice` on PaymentsRuntime instead of importing from payments package
- **Payments package**: Added `resolvePrice` method to PaymentsRuntime for use by extensions
- **Types package**: Fixed inline type imports within types package (payments, a2a) and added `resolvePrice` to PaymentsRuntime type
- **Identity package**: Fixed inline type import for TrustConfig
- **All packages**: Converted unnecessary dynamic imports to static imports in tests, templates, and examples

These changes improve code quality and eliminate circular dependencies while maintaining backward compatibility.
