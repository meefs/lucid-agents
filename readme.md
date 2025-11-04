# Lucid Dreams Agent Platform

Build, ship, and monetize AI agents with a consistent surface across runtimes. This monorepo hosts the primitives we use to describe agent capabilities once and deliver them through web servers, manifests, and on-chain identity.

## Overview

- **Agent-first HTTP surface:** Define entrypoints with strict typing, instant discovery endpoints, and automatic AgentCard manifests.
- **Built-in monetization:** x402 pricing, payments middleware, and helpers for paid LLM calls.
- **Trust & identity:** ERC-8004 integrations so agents can prove ownership, reputation, and validation history.

## Key Packages

- `@lucid-dreams/agent-kit` — Hono wrapper that registers entrypoints, serves manifests, manages payments, and exposes trust metadata utilities.
- `@lucid-dreams/agent-kit-identity` — ERC-8004 toolkit for registering agents, generating trust configs, and working with reputation/validation registries.

Each package README contains API details, environment variables, and complete examples.

## Getting Started

1. Install dependencies with `bun install`.
2. Explore `packages/agent-kit` to scaffold an agent server via `createAgentApp`.
3. Pair with `packages/agent-kit-identity` to register on-chain identity and surface trust metadata.
4. Check `examples/` for end-to-end scripts, including monetized LLM calls and ERC-8004 workflows.

## Contributing

- Use `bun test` and package-level scripts where available before opening PRs.
- Keep documentation precise and update manifests or examples when APIs change.
- Follow the repository coding standards and TypeScript linting configuration.

## Resources

- ERC-8004 specification: <https://eips.ethereum.org/EIPS/eip-8004>
- Lucid Dreams org: <https://github.com/lucid-dreams-ai>
