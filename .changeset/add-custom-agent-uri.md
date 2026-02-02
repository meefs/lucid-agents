---
"@lucid-agents/identity": patch
---

Add support for custom `agentURI` parameter in identity registration

- Added `agentURI` option to `CreateAgentIdentityOptions`, `BootstrapIdentityOptions`, and `BootstrapTrustOptions`
- When provided, the custom `agentURI` is used for ERC-8004 registration instead of the default `.well-known/agent-registration.json` format
- This allows agents to register with URIs like `https://api.example.com/agents/ag_xxx/.well-known/agent-card.json`
