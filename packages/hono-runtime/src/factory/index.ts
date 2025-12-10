/**
 * Agent Runtime Factory
 *
 * Builds agent runtimes dynamically from stored definitions using
 * the @lucid-agents/core builder pattern.
 */

import { createAgent } from '@lucid-agents/core';
import { http } from '@lucid-agents/http';
import { a2a } from '@lucid-agents/a2a';
import { payments } from '@lucid-agents/payments';
import { wallets } from '@lucid-agents/wallet';
import { ap2 } from '@lucid-agents/ap2';
import { analytics } from '@lucid-agents/analytics';
import { z } from 'zod';
import type { AgentRuntime } from '@lucid-agents/types';
import type { AgentDefinition, SerializedEntrypoint } from '../store/types';
import { HandlerRegistry } from '../handlers/registry';
import { createJsHandler } from '../handlers/js';
import { createUrlHandler } from '../handlers/url';
import type { HandlerFn } from '../handlers';

// =============================================================================
// Types
// =============================================================================

export interface RuntimeFactoryConfig {
  /** Default payments configuration (if agent doesn't specify) */
  defaultPaymentsConfig?: {
    payTo: string;
    network: string;
    facilitatorUrl: string;
    storage?: {
      type: 'sqlite' | 'in-memory' | 'postgres';
      sqlite?: {
        dbPath?: string;
      };
      postgres?: {
        connectionString: string;
      };
    };
  };

  /** Default wallets configuration (if agent doesn't specify) */
  defaultWalletsConfig?: {
    agent?: {
      type: 'local';
      privateKey: string;
    };
  };
}

// =============================================================================
// Runtime Factory
// =============================================================================

/**
 * Build an AgentRuntime from a stored AgentDefinition.
 *
 * This uses the @lucid-agents/core builder pattern to compose
 * extensions (http, a2a, payments, wallets) based on the agent's config.
 */
export async function buildRuntimeForAgent(
  definition: AgentDefinition,
  factoryConfig?: RuntimeFactoryConfig
): Promise<AgentRuntime> {
  const handlerRegistry = new HandlerRegistry();
  handlerRegistry.registerJsFactory(createJsHandler);
  handlerRegistry.registerUrlFactory(createUrlHandler);

  // Start with base agent metadata
  let builder = createAgent({
    name: definition.name,
    version: definition.version,
    description: definition.description,
  });

  // Always add HTTP extension (required for API)
  builder = builder.use(http());

  // Always add A2A extension (for agent discovery/interop)
  builder = builder.use(a2a());

  // Add payments if agent has payment config or factory has default
  const paymentsConfig =
    definition.paymentsConfig ?? factoryConfig?.defaultPaymentsConfig;
  if (paymentsConfig) {
    const paymentsExtensionConfig: any = {
      payTo: paymentsConfig.payTo,
      network: paymentsConfig.network as any, // Network type is strict, cast for flexibility
      facilitatorUrl: paymentsConfig.facilitatorUrl as `${string}://${string}`,
    };

    // Include storage config if provided (for analytics)
    if (paymentsConfig.storage) {
      paymentsExtensionConfig.storage = paymentsConfig.storage;
    }

    builder = builder.use(payments({ config: paymentsExtensionConfig }));
  }

  // Add wallets if agent has wallet config or factory has default
  const walletsConfig =
    definition.walletsConfig ?? factoryConfig?.defaultWalletsConfig;
  if (walletsConfig?.agent) {
    // Cast to any to handle the union type mismatch between serialized and runtime config
    builder = builder.use(
      wallets({ config: { agent: walletsConfig.agent as any } })
    );
  }

  // Add AP2 extension if configured
  if (definition.ap2Config) {
    builder = builder.use(
      ap2({
        roles: definition.ap2Config.roles as any,
        description: definition.ap2Config.description,
        required: definition.ap2Config.required ?? false,
      })
    );
  }

  // Add analytics extension if payments are enabled (analytics depends on payments)
  if (paymentsConfig) {
    builder = builder.use(analytics());
  }

  // Build the runtime
  const runtime = await builder.build();

  // Add entrypoints from definition
  for (const ep of definition.entrypoints) {
    addEntrypointToRuntime(runtime, ep, definition, handlerRegistry);
  }

  return runtime;
}

/**
 * Add an entrypoint from a serialized definition to the runtime
 */
function addEntrypointToRuntime(
  runtime: AgentRuntime,
  entrypoint: SerializedEntrypoint,
  agent: AgentDefinition,
  handlerRegistry: HandlerRegistry
): void {
  // Build Zod schemas from JSON Schema (simplified - just accept any for MVP)
  const inputSchema = z.unknown();
  const outputSchema = z.unknown();

  // Create handler based on handler type
  const handler = handlerRegistry.resolveHandler(
    entrypoint.handlerType,
    entrypoint.handlerConfig
  ) as HandlerFn;

  // Wrap HandlerFn to the EntrypointHandler shape expected by runtime
  const wrappedHandler = async (ctx: any) => {
    const handlerCtx = {
      agentId: agent.id,
      entrypointKey: entrypoint.key,
      input: ctx.input,
      sessionId:
        (ctx.metadata && (ctx.metadata as Record<string, unknown>).sessionId) ||
        ctx.runId ||
        crypto.randomUUID(),
      requestId: ctx.runId ?? crypto.randomUUID(),
      metadata: (ctx.metadata as Record<string, unknown>) ?? {},
    };

    const result = await handler(handlerCtx);

    return {
      output: result.output,
      usage: result.usage,
      model: undefined,
    };
  };

  // Add to runtime
  runtime.entrypoints.add({
    key: entrypoint.key,
    description: entrypoint.description,
    input: inputSchema,
    output: outputSchema,
    price: entrypoint.price,
    network: entrypoint.network as any, // Network type is strict, cast for flexibility
    handler: wrappedHandler,
  });
}

// =============================================================================
// Runtime Cache
// =============================================================================

/**
 * Simple LRU-style cache for agent runtimes
 */
export class RuntimeCache {
  private cache = new Map<string, { runtime: AgentRuntime; version: string }>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  get(agentId: string, version: string): AgentRuntime | null {
    const entry = this.cache.get(agentId);
    if (entry && entry.version === version) {
      return entry.runtime;
    }
    return null;
  }

  set(agentId: string, version: string, runtime: AgentRuntime): void {
    // Simple eviction: remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(agentId, { runtime, version });
  }

  delete(agentId: string): void {
    this.cache.delete(agentId);
  }

  clear(): void {
    this.cache.clear();
  }
}
