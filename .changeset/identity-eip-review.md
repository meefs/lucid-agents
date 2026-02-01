---
"@lucid-agents/identity": patch
"@lucid-agents/types": patch
"@lucid-agents/wallet": patch
---

ERC-8004 Identity Registry updates and ABI alignment:

**New Features**
- Agent wallet management (`getAgentWallet`, `setAgentWallet`, `unsetAgentWallet`) with EIP-712 signing
- `unsetAgentWallet(agentId)` now calls dedicated on-chain function directly (no signature required)
- `isAuthorizedOrOwner(spender, agentId)` read function to check authorization
- Optional validation request bodies that are hashed

**API Changes**
- Identity manifest renamed from "metadata" to "registration" and now includes registry identifier
- Reputation feedback uses integer `value` + `valueDecimals` format
- Validation request/response payloads and identifiers updated
- New version/registry discovery endpoints added
- `registryAddress` required when building trust config from identity records

**Documentation**
- Examples, guides, tests, and changelogs updated to registration-centric workflow
- New reputation/validation formats documented
