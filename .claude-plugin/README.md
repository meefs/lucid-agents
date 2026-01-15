# Lucid Agents Skills Marketplace

This marketplace provides skills for working with the Lucid Agents ecosystem:

## Available Skills

### lucid-agents-sdk
Skill for working with the Lucid Agents SDK - a TypeScript framework for building and monetizing AI agents. Includes guidance on:
- Building agents with extensions (http, payments, identity, a2a, etc.)
- Using adapters (Hono, Express, TanStack)
- Payment networks (EVM and Solana)
- Code structure principles
- Common development tasks

### lucid-client-api
Skill for interacting with the Lucid Client API (multi-agent runtime). Includes:
- Agent management endpoints
- Entrypoint invocation
- Payment handling (x402 protocol)
- Secrets management
- Analytics and rankings

## Installation

Add this marketplace to Claude Code:

```
/plugin marketplace add [your-github-org]/lucid-agents
```

Or if hosting elsewhere, use the full repository URL.

## Usage

Once installed, the skills will automatically activate when you:
- Work with Lucid Agents SDK code
- Interact with Lucid Client API
- Build or modify agent projects
- Ask questions about the Lucid Agents architecture

## License

MIT
