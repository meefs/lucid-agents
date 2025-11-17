import {
  evaluatePaymentRequirement as evaluatePaymentRequirementFromPayments,
  resolveActivePayments,
} from '@lucid-agents/payments';
import type {
  AgentCardWithEntrypoints,
  AgentKitConfig,
  AgentRuntime,
  AP2Config,
} from '@lucid-agents/types/core';
import type { TrustConfig } from '@lucid-agents/types/identity';
import type { PaymentsConfig } from '@lucid-agents/types/payments';
import { createAgentWallet } from '@lucid-agents/wallet';

import { getAgentKitConfig, setActiveInstanceConfig } from './config/config';
import { createAgentCore } from './core/agent';
import type { AgentMeta, Network } from './core/types';
import type { EntrypointDef } from './http/types';
import { buildManifest } from './manifest/manifest';

export type CreateAgentRuntimeOptions = {
  payments?: PaymentsConfig | false;
  ap2?: AP2Config;
  trust?: TrustConfig;
  entrypoints?: Iterable<EntrypointDef>;
  config?: AgentKitConfig;
};

export function createAgentRuntime(
  meta: AgentMeta,
  opts: CreateAgentRuntimeOptions = {}
): AgentRuntime {
  setActiveInstanceConfig(opts?.config);
  const resolvedConfig: AgentKitConfig = getAgentKitConfig(opts?.config);

  // Create wallets from config
  const wallets = resolvedConfig.wallets
    ? {
        agent: resolvedConfig.wallets.agent
          ? createAgentWallet(resolvedConfig.wallets.agent)
          : undefined,
        developer: resolvedConfig.wallets.developer
          ? createAgentWallet(resolvedConfig.wallets.developer)
          : undefined,
      }
    : undefined;

  // Create agent core with payments
  const paymentsOption = opts?.payments;
  const resolvedPayments: PaymentsConfig | undefined =
    paymentsOption === false
      ? undefined
      : (paymentsOption ?? resolvedConfig.payments);

  let activePayments: PaymentsConfig | undefined = resolvedPayments;

  const agent = createAgentCore({
    meta,
    payments: paymentsOption === false ? false : (activePayments ?? undefined),
  });

  const manifestCache = new Map<string, AgentCardWithEntrypoints>();

  const snapshotEntrypoints = (): EntrypointDef[] =>
    agent.listEntrypoints().map(entry => ({
      ...entry,
      network: entry.network as Network | undefined,
    })) as EntrypointDef[];

  const listEntrypoints = () =>
    snapshotEntrypoints().map(entry => ({
      key: entry.key,
      description: entry.description,
      streaming: Boolean(entry.stream ?? entry.streaming),
    }));

  const buildManifestForOrigin = (origin: string) => {
    const cached = manifestCache.get(origin);
    if (cached) {
      return cached;
    }

    const manifest = buildManifest({
      meta,
      registry: snapshotEntrypoints(),
      origin,
      payments: activePayments,
      ap2: opts?.ap2,
      trust: opts?.trust,
    });

    manifestCache.set(origin, manifest);
    return manifest;
  };

  const invalidateManifestCache = () => {
    manifestCache.clear();
  };

  const addEntrypoint = (def: EntrypointDef) => {
    if (!def.key) throw new Error('entrypoint.key required');
    const newActivePayments = resolveActivePayments(
      def,
      paymentsOption,
      resolvedPayments,
      activePayments
    );
    if (newActivePayments !== activePayments) {
      activePayments = newActivePayments;
      agent.config.payments =
        paymentsOption === false ? false : (activePayments ?? undefined);
    }
    agent.addEntrypoint(def);
    invalidateManifestCache();
  };

  if (opts?.entrypoints) {
    for (const entrypoint of opts.entrypoints) {
      addEntrypoint(entrypoint);
    }
  }

  return {
    agent,
    config: resolvedConfig,
    wallets,
    get payments() {
      return activePayments;
    },
    addEntrypoint,
    listEntrypoints,
    snapshotEntrypoints,
    buildManifestForOrigin,
    invalidateManifestCache,
    evaluatePaymentRequirement: (entrypoint, kind) => {
      return evaluatePaymentRequirementFromPayments(
        entrypoint,
        kind,
        activePayments
      );
    },
  } satisfies AgentRuntime;
}
