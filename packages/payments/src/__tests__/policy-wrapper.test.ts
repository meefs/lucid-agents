import { describe, expect, it, beforeEach } from 'bun:test';
import type { PaymentPolicyGroup } from '@lucid-agents/types/payments';
import { wrapBaseFetchWithPolicy } from '../policy-wrapper';
import { createSpendingTracker } from '../spending-tracker';
import { createRateLimiter } from '../rate-limiter';

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

describe('wrapBaseFetchWithPolicy', () => {
  let baseFetch: FetchLike;
  let spendingTracker: ReturnType<typeof createSpendingTracker>;
  let rateLimiter: ReturnType<typeof createRateLimiter>;
  let policyGroups: PaymentPolicyGroup[];

  beforeEach(() => {
    spendingTracker = createSpendingTracker();
    rateLimiter = createRateLimiter();
    policyGroups = [
      {
        name: 'test-policy',
        spendingLimits: {
          global: {
            maxPaymentUsd: 10.0,
          },
        },
      },
    ];
  });

  it('should pass through non-402 responses unchanged', async () => {
    baseFetch = async () => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const wrappedFetch = wrapBaseFetchWithPolicy(
      baseFetch,
      policyGroups,
      spendingTracker,
      rateLimiter
    );

    const response = await wrappedFetch('https://example.com');
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ ok: true });
  });

  it('should block 402 responses that violate policies', async () => {
    baseFetch = async () => {
      return new Response(
        JSON.stringify({ error: 'Payment required' }),
        {
          status: 402,
          headers: {
            'Content-Type': 'application/json',
            'X-Price': '15.0', // 15 USDC (over 10 USDC limit)
            'X-Pay-To': '0x123...',
          },
        }
      );
    };

    const wrappedFetch = wrapBaseFetchWithPolicy(
      baseFetch,
      policyGroups,
      spendingTracker,
      rateLimiter
    );

    const response = await wrappedFetch('https://example.com');
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error.code).toBe('policy_violation');
    expect(data.error.message).toContain('spending limit');
  });

  it('should allow 402 responses that pass policies', async () => {
    baseFetch = async () => {
      return new Response(
        JSON.stringify({ error: 'Payment required' }),
        {
          status: 402,
          headers: {
            'Content-Type': 'application/json',
            'X-Price': '5.0', // 5 USDC (under 10 USDC limit)
            'X-Pay-To': '0x123...',
          },
        }
      );
    };

    const wrappedFetch = wrapBaseFetchWithPolicy(
      baseFetch,
      policyGroups,
      spendingTracker,
      rateLimiter
    );

    const response = await wrappedFetch('https://example.com');
    expect(response.status).toBe(402); // Should pass through
  });

  it('should record spending after successful payment', async () => {
    let callCount = 0;
    baseFetch = async () => {
      callCount++;
      if (callCount === 1) {
        // First call: 402 payment required
        return new Response(
          JSON.stringify({ error: 'Payment required' }),
          {
            status: 402,
            headers: {
              'X-Price': '5.0',
              'X-Pay-To': '0x123...',
            },
          }
        );
      }
      // Second call: successful payment
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'X-PAYMENT-RESPONSE': 'settled',
          'X-Price': '5.0',
        },
      });
    };

    const wrappedFetch = wrapBaseFetchWithPolicy(
      baseFetch,
      policyGroups,
      spendingTracker,
      rateLimiter
    );

    // First call (402) - should pass through
    const response1 = await wrappedFetch('https://example.com');
    expect(response1.status).toBe(402);

    // Second call (success) - should record
    const response2 = await wrappedFetch('https://example.com');
    expect(response2.status).toBe(200);

    // Check that spending was recorded
    // Since the policy only has global limits, the scope is 'global'
    const total = spendingTracker.getCurrentTotal('test-policy', 'global');
    expect(total).toBeDefined();
    expect(Number(total) / 1_000_000).toBe(5.0);
  });

  it('should extract domain from URL for recipient matching', async () => {
    const blockingPolicy: PaymentPolicyGroup[] = [
      {
        name: 'blocker',
        blockedRecipients: ['https://blocked.example.com'],
      },
    ];

    baseFetch = async () => {
      return new Response(
        JSON.stringify({ error: 'Payment required' }),
        {
          status: 402,
          headers: {
            'X-Price': '1.0',
            'X-Pay-To': '0x123...',
          },
        }
      );
    };

    const wrappedFetch = wrapBaseFetchWithPolicy(
      baseFetch,
      blockingPolicy,
      spendingTracker,
      rateLimiter
    );

    const response = await wrappedFetch('https://blocked.example.com/api');
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error.code).toBe('policy_violation');
  });

  describe('scope resolution for spending limits', () => {
    beforeEach(() => {
      spendingTracker.clear();
    });

    it('should use endpoint URL scope when perEndpoint limit matches', async () => {
      const endpointUrl = 'https://agent.example.com/entrypoints/process/invoke';
      policyGroups = [
        {
          name: 'endpoint-policy',
          spendingLimits: {
            perEndpoint: {
              [endpointUrl]: {
                maxTotalUsd: 100.0,
              },
            },
          },
        },
      ];

      let callCount = 0;
      baseFetch = async () => {
        callCount++;
        if (callCount === 1) {
          return new Response(JSON.stringify({ error: 'Payment required' }), {
            status: 402,
            headers: {
              'X-Price': '5.0',
              'X-Pay-To': '0x123...',
            },
          });
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'X-PAYMENT-RESPONSE': 'settled',
            'X-Price': '5.0',
          },
        });
      };

      const wrappedFetch = wrapBaseFetchWithPolicy(
        baseFetch,
        policyGroups,
        spendingTracker,
        rateLimiter
      );

      await wrappedFetch(endpointUrl, { method: 'GET' });
      await wrappedFetch(endpointUrl, { method: 'GET' });

      const total = spendingTracker.getCurrentTotal('endpoint-policy', endpointUrl);
      expect(total).toBeDefined();
      expect(Number(total) / 1_000_000).toBe(5.0);
    });

    it('should use target domain scope when perTarget limit matches', async () => {
      const targetUrl = 'https://agent.example.com';
      const endpointUrl = `${targetUrl}/entrypoints/process/invoke`;
      policyGroups = [
        {
          name: 'target-policy',
          spendingLimits: {
            perTarget: {
              [targetUrl]: {
                maxTotalUsd: 100.0,
              },
            },
          },
        },
      ];

      let callCount = 0;
      baseFetch = async () => {
        callCount++;
        if (callCount === 1) {
          return new Response(JSON.stringify({ error: 'Payment required' }), {
            status: 402,
            headers: {
              'X-Price': '5.0',
              'X-Pay-To': '0x123...',
            },
          });
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'X-PAYMENT-RESPONSE': 'settled',
            'X-Price': '5.0',
          },
        });
      };

      const wrappedFetch = wrapBaseFetchWithPolicy(
        baseFetch,
        policyGroups,
        spendingTracker,
        rateLimiter
      );

      await wrappedFetch(endpointUrl, { method: 'GET' });
      await wrappedFetch(endpointUrl, { method: 'GET' });

      const normalizedKey = targetUrl.trim().toLowerCase().replace(/\/+$/, '');
      const total = spendingTracker.getCurrentTotal('target-policy', normalizedKey);
      expect(total).toBeDefined();
      expect(Number(total) / 1_000_000).toBe(5.0);
    });

    it('should use global scope when only global limit exists', async () => {
      const endpointUrl = 'https://agent.example.com/entrypoints/process/invoke';
      policyGroups = [
        {
          name: 'global-policy',
          spendingLimits: {
            global: {
              maxTotalUsd: 100.0,
            },
          },
        },
      ];

      let callCount = 0;
      baseFetch = async () => {
        callCount++;
        if (callCount === 1) {
          return new Response(JSON.stringify({ error: 'Payment required' }), {
            status: 402,
            headers: {
              'X-Price': '5.0',
              'X-Pay-To': '0x123...',
            },
          });
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'X-PAYMENT-RESPONSE': 'settled',
            'X-Price': '5.0',
          },
        });
      };

      const wrappedFetch = wrapBaseFetchWithPolicy(
        baseFetch,
        policyGroups,
        spendingTracker,
        rateLimiter
      );

      await wrappedFetch(endpointUrl, { method: 'GET' });
      await wrappedFetch(endpointUrl, { method: 'GET' });

      const total = spendingTracker.getCurrentTotal('global-policy', 'global');
      expect(total).toBeDefined();
      expect(Number(total) / 1_000_000).toBe(5.0);
    });

    it('should use endpoint scope when both endpoint and target limits exist (endpoint takes precedence)', async () => {
      const targetUrl = 'https://agent.example.com';
      const endpointUrl = `${targetUrl}/entrypoints/process/invoke`;
      policyGroups = [
        {
          name: 'multi-policy',
          spendingLimits: {
            perEndpoint: {
              [endpointUrl]: {
                maxTotalUsd: 50.0,
              },
            },
            perTarget: {
              [targetUrl]: {
                maxTotalUsd: 100.0,
              },
            },
            global: {
              maxTotalUsd: 200.0,
            },
          },
        },
      ];

      let callCount = 0;
      baseFetch = async () => {
        callCount++;
        if (callCount === 1) {
          return new Response(JSON.stringify({ error: 'Payment required' }), {
            status: 402,
            headers: {
              'X-Price': '5.0',
              'X-Pay-To': '0x123...',
            },
          });
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'X-PAYMENT-RESPONSE': 'settled',
            'X-Price': '5.0',
          },
        });
      };

      const wrappedFetch = wrapBaseFetchWithPolicy(
        baseFetch,
        policyGroups,
        spendingTracker,
        rateLimiter
      );

      await wrappedFetch(endpointUrl, { method: 'GET' });
      await wrappedFetch(endpointUrl, { method: 'GET' });

      const endpointTotal = spendingTracker.getCurrentTotal('multi-policy', endpointUrl);
      expect(endpointTotal).toBeDefined();
      expect(Number(endpointTotal) / 1_000_000).toBe(5.0);

      const normalizedTarget = targetUrl.toLowerCase().replace(/\/+$/, '');
      const targetTotal = spendingTracker.getCurrentTotal('multi-policy', normalizedTarget);
      expect(targetTotal).toBeUndefined();
    });
  });
});

