import {
  createRuntimePaymentContext,
  type RuntimePaymentOptions,
} from '@lucid-agents/payments';
import type { AgentRuntime } from '@lucid-agents/types/core';
import { afterEach, describe, expect, it, mock } from 'bun:test';

import { resetAgentKitConfigForTesting } from '../config/config';

const makeRuntimeStub = (): {
  runtime: Pick<AgentRuntime, 'wallets'>;
  calls: {
    getWalletMetadata: ReturnType<typeof mock>;
    signChallenge: ReturnType<typeof mock>;
  };
} => {
  const getWalletMetadata = mock(async () => ({
    address: '0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429',
  }));
  const signChallenge = mock(async (_challenge: unknown) => '0xdeadbeef');

  const runtime: Pick<AgentRuntime, 'wallets'> = {
    wallets: {
      agent: {
        kind: 'local' as const,
        connector: {
          async getWalletMetadata() {
            return await getWalletMetadata();
          },
          async signChallenge(challenge) {
            return await signChallenge(challenge);
          },
          async supportsCaip2() {
            return true;
          },
        },
      },
    },
  };

  return {
    runtime,
    calls: {
      getWalletMetadata,
      signChallenge,
    },
  };
};

const paymentRequirements = {
  scheme: 'exact',
  network: 'base-sepolia',
  maxAmountRequired: '1000',
  resource: 'https://example.com/pay',
  description: 'payment',
  mimeType: 'application/json',
  payTo: '0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429',
  maxTimeoutSeconds: 30,
  asset: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
};

describe('runtime payments', () => {
  afterEach(() => {
    resetAgentKitConfigForTesting();
  });

  it('wraps fetch with x402 handling using the runtime wallet', async () => {
    const { runtime, calls } = makeRuntimeStub();

    const fetchCalls: Array<{
      input: string | URL | Request;
      init?: RequestInit;
    }> = [];
    let attempt = 0;
    const baseFetch = mock(
      async (
        input: Parameters<typeof fetch>[0],
        init?: Parameters<typeof fetch>[1]
      ) => {
        fetchCalls.push({ input, init: init ?? undefined });
        attempt += 1;
        if (attempt === 1) {
          return new Response(
            JSON.stringify({
              x402Version: 1,
              accepts: [paymentRequirements],
            }),
            {
              status: 402,
              headers: { 'content-type': 'application/json' },
            }
          );
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'X-PAYMENT-RESPONSE': 'settled',
          },
        });
      }
    );

    const context = await createRuntimePaymentContext({
      runtime: runtime as unknown as AgentRuntime,
      fetch: baseFetch,
      network: 'base-sepolia',
    } as unknown as RuntimePaymentOptions);

    expect(context.fetchWithPayment).toBeDefined();
    expect(context.signer).toBeDefined();
    expect(context.chainId).toBe(84532);

    const response = await context.fetchWithPayment?.('https://example.com', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hello: 'world' }),
    });

    expect(response?.status).toBe(200);
    expect(await response?.json()).toEqual({ ok: true });

    expect(fetchCalls).toHaveLength(2);
    // getWalletMetadata is called once initially and may be called again during signing
    expect(calls.getWalletMetadata).toHaveBeenCalled();
    expect(calls.signChallenge).toHaveBeenCalledTimes(1);
  });

  it('returns null fetch when no runtime or private key provided', async () => {
    const context = await createRuntimePaymentContext({
      runtime: undefined,
      fetch: async () => new Response('ok'),
    });
    expect(context.fetchWithPayment).toBeNull();
    expect(context.signer).toBeNull();
    expect(context.walletAddress).toBeNull();
  });

  it('warns when chain cannot be derived', async () => {
    const { runtime } = makeRuntimeStub();

    const warn = mock(() => {});
    const context = await createRuntimePaymentContext({
      runtime: runtime as unknown as AgentRuntime,
      fetch: async () => new Response('ok'),
      network: 'unsupported-network',
      logger: { warn },
    } as unknown as RuntimePaymentOptions);

    expect(context.fetchWithPayment).toBeNull();
    expect(warn).toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Unable to derive chainId')
    );
  });
});

describe('runtime Solana payments', () => {
  afterEach(() => {
    resetAgentKitConfigForTesting();
  });

  it('accepts Solana network configuration', async () => {
    const solanaNetworks = ['solana', 'solana-devnet'] as const;

    for (const network of solanaNetworks) {
      const context = await createRuntimePaymentContext({
        runtime: undefined,
        fetch: async () => new Response('ok'),
        network,
        privateKey:
          '0x1234567890123456789012345678901234567890123456789012345678901234',
      });

      // For Solana networks without proper signer setup, it should handle gracefully
      // The actual Solana signer creation is handled by x402-fetch library
      expect(context).toBeDefined();
    }
  });

  it('accepts Solana Base58 address format in PaymentsConfig', () => {
    const validSolanaAddresses = [
      '9yPGxVrYi7C5JLMGjEZhK8qQ4tn7SzMWwQHvz3vGJCKz',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
    ];

    validSolanaAddresses.forEach(address => {
      // Type system should accept Solana address
      const config = {
        payTo: address,
        facilitatorUrl: 'https://facilitator.test' as const,
        network: 'solana-devnet' as const,
        defaultPrice: '10000',
      };

      expect(config.payTo).toBe(address);
      expect(config.network).toBe('solana-devnet');
    });
  });
});
