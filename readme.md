# Lucid Agents

Build, ship, and monetize AI agents with a consistent surface across runtimes. This monorepo hosts the primitives we use to describe agent capabilities once and deliver them through web servers, manifests, and onchain identity.

## Overview

- **Agent-first HTTP surface:** Define entrypoints with strict typing, instant discovery endpoints, and automatic AgentCard manifests.
- **Built-in monetization:** x402 pricing, payments middleware, and helpers for paid LLM calls.
- **Trust & identity:** ERC-8004 integrations so agents can prove ownership, reputation, and validation history.

## Key Packages

- [`@lucid-dreams/agent-kit`](packages/agent-kit/README.md) — Hono wrapper that registers entrypoints, serves manifests, manages payments, and exposes trust metadata utilities.
- [`@lucid-dreams/agent-kit-identity`](packages/agent-kit-identity/README.md) — ERC-8004 toolkit for registering agents, generating trust configs, and working with reputation/validation registries.

Each package README contains API details, environment variables, and complete examples.

## Features

- **Agent Kit runtime:** Ship typed entrypoints, manifests, and trust metadata with minimal wiring.
- **x402 bootstrapping:** Scaffold paid invoke/stream endpoints with CLI templates, payments middleware, and helper utilities.
- **Agent auth + ERC-8004:** Register identities, expose trust manifests, and manage reputation reviews via on-chain APIs.

## Example

```ts
import { z } from "zod";
import { createAgentApp } from "@lucid-dreams/agent-kit";
import {
  createAgentIdentity,
  getTrustConfig,
} from "@lucid-dreams/agent-kit-identity";

const identity = await createAgentIdentity({
  domain: "my-agent.example.com",
  autoRegister: true,
});

const { app, addEntrypoint } = createAgentApp(
  {
    name: "demo-agent",
    version: "0.1.0",
    description: "Echo text with optional reputation lookup",
  },
  {
    trust: getTrustConfig(identity),
  }
);

addEntrypoint({
  key: "echo",
  description: "Echo a message back",
  input: z.object({ text: z.string() }),
  async handler({ input }) {
    return { output: { text: input.text } };
  },
});

export default app;
```

This pair wires together the agent runtime and ERC-8004 trust metadata in just a few lines. Dive deeper in the package READMEs linked above.

## Getting Started

### Scaffold a New Agent

```bash
bunx @lucid-agents/create-agent-kit@latest
```

The CLI walks through template selection, environment setup, and optional dependency installation. Choose a project directory, decide whether to preconfigure ERC-8004 identity, and answer prompts for default pricing or entrypoint metadata.

### Iterate Locally

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
