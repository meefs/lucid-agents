---
"@lucid-agents/identity": minor
---

Add support for custom client factory via `makeClients` parameter in `createAgentIdentity`. This enables browser-based wallet integration (e.g., thirdweb) by allowing custom Viem client creation instead of requiring a wallet handle from the runtime.
