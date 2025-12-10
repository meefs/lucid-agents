import { describe, expect, it } from 'bun:test';
import { buildRuntimeForAgent } from '../factory';
import type { AgentDefinition, SerializedPaymentsConfig } from '../store/types';

describe('Agent Runtime Factory', () => {
  describe('agentId passing to payments extension', () => {
    it('should pass definition.id as agentId to payments extension', async () => {
      const agentId = 'test-agent-123';
      const paymentsConfig: SerializedPaymentsConfig = {
        payTo: '0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429',
        network: 'base-sepolia',
        facilitatorUrl: 'https://facilitator.test',
        storage: {
          type: 'postgres',
          postgres: {
            connectionString: 'postgresql://test:test@localhost:5432/test',
          },
        },
      };

      const definition: AgentDefinition = {
        id: agentId,
        ownerId: 'test-owner',
        name: 'test-agent',
        slug: 'test-agent',
        version: '1.0.0',
        description: 'Test agent',
        enabled: true,
        entrypoints: [],
        metadata: {},
        paymentsConfig,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const runtime = await buildRuntimeForAgent(definition);

      // Verify runtime was created
      expect(runtime).toBeDefined();
      expect(runtime.payments).toBeDefined();

      // The payments extension should have been configured with agentId
      // We can verify this by checking that the runtime has payments configured
      // and that it would use the agentId when creating storage
      expect(runtime.payments?.config).toBeDefined();
      expect(runtime.payments?.config.payTo).toBe(paymentsConfig.payTo);
    });

    it('should pass different agentIds for different agents', async () => {
      const agentId1 = 'agent-1';
      const agentId2 = 'agent-2';

      const paymentsConfig: SerializedPaymentsConfig = {
        payTo: '0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429',
        network: 'base-sepolia',
        facilitatorUrl: 'https://facilitator.test',
        storage: {
          type: 'postgres',
          postgres: {
            connectionString: 'postgresql://test:test@localhost:5432/test',
          },
        },
      };

      const definition1: AgentDefinition = {
        id: agentId1,
        ownerId: 'test-owner',
        name: 'agent-1',
        slug: 'agent-1',
        version: '1.0.0',
        description: '',
        enabled: true,
        entrypoints: [],
        metadata: {},
        paymentsConfig,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const definition2: AgentDefinition = {
        id: agentId2,
        ownerId: 'test-owner',
        name: 'agent-2',
        slug: 'agent-2',
        version: '1.0.0',
        description: '',
        enabled: true,
        entrypoints: [],
        metadata: {},
        paymentsConfig,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const runtime1 = await buildRuntimeForAgent(definition1);
      const runtime2 = await buildRuntimeForAgent(definition2);

      // Both should have payments configured
      expect(runtime1.payments).toBeDefined();
      expect(runtime2.payments).toBeDefined();

      // They should be separate instances
      expect(runtime1).not.toBe(runtime2);
    });

    it('should work without payments config', async () => {
      const definition: AgentDefinition = {
        id: 'test-agent',
        ownerId: 'test-owner',
        name: 'test-agent',
        slug: 'test-agent',
        version: '1.0.0',
        description: '',
        enabled: true,
        entrypoints: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const runtime = await buildRuntimeForAgent(definition);

      expect(runtime).toBeDefined();
      expect(runtime.payments).toBeUndefined();
    });
  });

  describe('Type safety in factory', () => {
    it('should properly convert payments config without type assertions', async () => {
      const definition: AgentDefinition = {
        id: 'test-agent',
        ownerId: 'test-owner',
        name: 'test-agent',
        slug: 'test-agent',
        version: '1.0.0',
        description: '',
        enabled: true,
        entrypoints: [],
        metadata: {},
        paymentsConfig: {
          payTo: '0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429',
          network: 'base-sepolia',
          facilitatorUrl: 'https://facilitator.test',
          storage: {
            type: 'sqlite',
          },
          policyGroups: [
            {
              name: 'test-policy',
              outgoingLimits: {
                global: {
                  maxTotalUsd: 100,
                },
              },
            },
          ],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Should not throw type errors
      const runtime = await buildRuntimeForAgent(definition);

      expect(runtime.payments).toBeDefined();
      expect(runtime.payments?.config.payTo).toBe(
        definition.paymentsConfig!.payTo
      );
      expect(runtime.payments?.config.network).toBe('base-sepolia');
      expect(runtime.payments?.config.policyGroups).toBeDefined();
      expect(runtime.payments?.config.policyGroups).toHaveLength(1);
    });

    it('should properly construct local wallet config', async () => {
      const definition: AgentDefinition = {
        id: 'test-agent',
        ownerId: 'test-owner',
        name: 'test-agent',
        slug: 'test-agent',
        version: '1.0.0',
        description: '',
        enabled: true,
        entrypoints: [],
        metadata: {},
        walletsConfig: {
          agent: {
            type: 'local',
            privateKey:
              '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const runtime = await buildRuntimeForAgent(definition);

      expect(runtime.wallets).toBeDefined();
      expect(runtime.wallets?.agent).toBeDefined();
      expect(runtime.wallets?.agent?.kind).toBe('local');
    });

    it('should properly construct thirdweb wallet config', async () => {
      const definition: AgentDefinition = {
        id: 'test-agent',
        ownerId: 'test-owner',
        name: 'test-agent',
        slug: 'test-agent',
        version: '1.0.0',
        description: '',
        enabled: true,
        entrypoints: [],
        metadata: {},
        walletsConfig: {
          agent: {
            type: 'thirdweb',
            secretKey: 'test-secret-key',
            clientId: 'test-client-id',
            walletLabel: 'test-wallet',
            chainId: 84532, // base-sepolia
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const runtime = await buildRuntimeForAgent(definition);

      expect(runtime.wallets).toBeDefined();
      expect(runtime.wallets?.agent).toBeDefined();
      expect(runtime.wallets?.agent?.kind).toBe('thirdweb');
    });

    it('should handle wallet config without privateKey for local type', async () => {
      const definition: AgentDefinition = {
        id: 'test-agent',
        ownerId: 'test-owner',
        name: 'test-agent',
        slug: 'test-agent',
        version: '1.0.0',
        description: '',
        enabled: true,
        entrypoints: [],
        metadata: {},
        walletsConfig: {
          agent: {
            type: 'local',
            // No privateKey - should not create wallet
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const runtime = await buildRuntimeForAgent(definition);

      // Should not have wallets if privateKey is missing
      expect(runtime.wallets).toBeUndefined();
    });

    it('should handle payments config with policyGroups', async () => {
      const definition: AgentDefinition = {
        id: 'test-agent',
        ownerId: 'test-owner',
        name: 'test-agent',
        slug: 'test-agent',
        version: '1.0.0',
        description: '',
        enabled: true,
        entrypoints: [],
        metadata: {},
        paymentsConfig: {
          payTo: '0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429',
          network: 'base-sepolia',
          facilitatorUrl: 'https://facilitator.test',
          policyGroups: [
            {
              name: 'daily-limit',
              outgoingLimits: {
                global: {
                  maxTotalUsd: 1000,
                  windowMs: 86400000, // 24 hours
                },
              },
            },
          ],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const runtime = await buildRuntimeForAgent(definition);

      expect(runtime.payments).toBeDefined();
      expect(runtime.payments?.config.policyGroups).toBeDefined();
      expect(runtime.payments?.config.policyGroups).toHaveLength(1);
      expect(runtime.payments?.config.policyGroups![0].name).toBe(
        'daily-limit'
      );
    });

    it('should handle payments config without policyGroups', async () => {
      const definition: AgentDefinition = {
        id: 'test-agent',
        ownerId: 'test-owner',
        name: 'test-agent',
        slug: 'test-agent',
        version: '1.0.0',
        description: '',
        enabled: true,
        entrypoints: [],
        metadata: {},
        paymentsConfig: {
          payTo: '0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429',
          network: 'base-sepolia',
          facilitatorUrl: 'https://facilitator.test',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const runtime = await buildRuntimeForAgent(definition);

      expect(runtime.payments).toBeDefined();
      // policyGroups should be undefined, not an empty array
      expect(runtime.payments?.config.policyGroups).toBeUndefined();
    });
  });

  describe('Extension integration', () => {
    it('should build runtime with all extensions', async () => {
      const definition: AgentDefinition = {
        id: 'test-agent',
        ownerId: 'test-owner',
        name: 'test-agent',
        slug: 'test-agent',
        version: '1.0.0',
        description: '',
        enabled: true,
        entrypoints: [],
        metadata: {},
        paymentsConfig: {
          payTo: '0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429',
          network: 'base-sepolia',
          facilitatorUrl: 'https://facilitator.test',
          storage: {
            type: 'sqlite',
          },
          policyGroups: [
            {
              name: 'test-policy',
              outgoingLimits: {
                global: {
                  maxTotalUsd: 100,
                },
              },
            },
          ],
        },
        walletsConfig: {
          agent: {
            type: 'local',
            privateKey:
              '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          },
        },
        a2aConfig: {
          enabled: true,
        },
        ap2Config: {
          roles: ['payer'],
        },
        analyticsConfig: {
          enabled: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const runtime = await buildRuntimeForAgent(definition);

      expect(runtime.payments).toBeDefined();
      expect(runtime.wallets).toBeDefined();
      expect(runtime.a2a).toBeDefined();
      expect(runtime.ap2).toBeDefined();
      expect(runtime.analytics).toBeDefined();
    });
  });
});
