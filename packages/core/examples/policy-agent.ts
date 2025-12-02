import { createAgent } from '@lucid-agents/core';
import { createAgentApp } from '@lucid-agents/hono';
import { http } from '@lucid-agents/http';
import {
  createRuntimePaymentContext,
  payments,
  paymentsFromEnv,
} from '@lucid-agents/payments';
import { wallets, walletsFromEnv } from '@lucid-agents/wallet';
import { z } from 'zod';

/**
 * Example agent demonstrating payment policy enforcement.
 *
 * This agent:
 * - Uses payment policies to control spending limits
 * - Restricts which agents it can pay
 * - Limits rate of payments
 * - Tracks total spending over time windows
 *
 * Required environment variables:
 *   - FACILITATOR_URL - x402 facilitator endpoint
 *   - PAYMENTS_RECEIVABLE_ADDRESS - Address that receives payments
 *   - NETWORK - Network identifier (e.g., base-sepolia)
 *   - WALLET_PRIVATE_KEY - Private key for agent wallet (for making payments)
 *
 * Policy configuration:
 *   - Policies are loaded from payment-policies.json in the project root
 *   - See payment-policies.json.example for the policy structure
 */

const agent = await createAgent({
  name: 'policy-agent',
  version: '1.0.0',
  description: 'Agent demonstrating payment policy enforcement',
})
  .use(http())
  .use(
    payments({
      config: paymentsFromEnv(),
      policies: 'payment-policies.json', // Load policies from file
    })
  )
  .use(wallets({ config: walletsFromEnv() }))
  .build();

const { app, addEntrypoint } = await createAgentApp(agent);

/**
 * Example entrypoint that calls another agent with payment policy enforcement.
 * Policies will automatically:
 * - Check spending limits before making payment
 * - Verify recipient is allowed
 * - Enforce rate limits
 * - Track total spending
 */
addEntrypoint({
  key: 'delegate-with-policy',
  description: 'Calls another agent with payment policy enforcement',
  input: z.object({
    targetUrl: z.string().url(),
    endpoint: z.string(),
    data: z.unknown(),
  }),
  output: z.object({
    result: z.unknown(),
    paymentPolicy: z.string(),
  }),
  handler: async ctx => {
    const runtime = ctx.runtime;
    if (!runtime) {
      throw new Error('Runtime not available');
    }

    // Create payment-enabled fetch (policies are automatically enforced)
    const paymentContext = await createRuntimePaymentContext({
      runtime,
      network: runtime.payments?.config.network || 'base-sepolia',
    });

    if (!paymentContext.fetchWithPayment) {
      throw new Error('Payment context not available');
    }

    // Use payment-enabled fetch - policies will check before allowing payment
    // If policy violation, returns 403 response
    try {
      const response = await paymentContext.fetchWithPayment(
        `${ctx.input.targetUrl}/entrypoints/${ctx.input.endpoint}/invoke`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(ctx.input.data),
        }
      );

      if (!response.ok) {
        // Check if it's a policy violation
        if (response.status === 403) {
          const error = await response.json().catch(() => ({}));
          throw new Error(
            error.error?.message || error.reason || 'Payment blocked by policy'
          );
        }
        throw new Error(`Request failed: ${response.status}`);
      }

      const result = await response.json();

      return {
        output: {
          result: result.output || result,
          paymentPolicy: 'Payment successful - policies passed',
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('policy')) {
        throw error;
      }
      throw new Error(
        `Failed to call agent: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
});

/**
 * Example entrypoint that demonstrates how policies work with multiple calls.
 */
addEntrypoint({
  key: 'batch-process',
  description: 'Processes multiple items with policy enforcement',
  input: z.object({
    items: z.array(z.string()),
    targetUrl: z.string().url(),
  }),
  output: z.object({
    processed: z.number(),
    blocked: z.number(),
    results: z.array(z.unknown()),
  }),
  handler: async ctx => {
    const runtime = ctx.runtime;
    if (!runtime?.payments) {
      throw new Error('Payments not configured');
    }

    const paymentContext = await createRuntimePaymentContext({
      runtime,
      network: runtime.payments.config.network,
    });

    if (!paymentContext.fetchWithPayment) {
      throw new Error('Payment context not available');
    }

    let processed = 0;
    let blocked = 0;
    const results: unknown[] = [];

    // Process items one by one - policies will enforce limits
    for (const item of ctx.input.items) {
      try {
        const response = await paymentContext.fetchWithPayment(
          `${ctx.input.targetUrl}/entrypoints/process/invoke`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ item }),
          }
        );

        if (response.status === 403) {
          // Policy violation
          const error = await response.json().catch(() => ({}));
          console.warn(
            `Policy violation for item ${item}:`,
            error.reason || error.error?.message
          );
          blocked++;
          continue;
        }

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const result = await response.json();
        results.push(result);
        processed++;
      } catch (error) {
        if (error instanceof Error && error.message.includes('policy')) {
          blocked++;
        } else {
          throw error;
        }
      }
    }

    return {
      output: {
        processed,
        blocked,
        results,
      },
    };
  },
});

const port = Number(process.env.PORT ?? 3000);

const server = Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(
  `🚀 Policy agent ready at http://${server.hostname}:${server.port}/.well-known/agent.json`
);

// Display policy information if available
if (agent.payments?.policyGroups) {
  console.log('📋 Payment policies configured:');
  agent.payments.policyGroups.forEach(group => {
    console.log(`  - ${group.name}`);
    if (group.spendingLimits?.global) {
      if (group.spendingLimits.global.maxPaymentUsd) {
        console.log(
          `    - Max payment: $${group.spendingLimits.global.maxPaymentUsd}`
        );
      }
      if (group.spendingLimits.global.maxTotalUsd) {
        console.log(
          `    - Max total: $${group.spendingLimits.global.maxTotalUsd}`
        );
      }
      if (group.spendingLimits.global.windowMs) {
        const hours = group.spendingLimits.global.windowMs / (60 * 60 * 1000);
        console.log(`    - Window: ${hours} hours`);
      }
    }
    if (group.spendingLimits?.perTarget) {
      const targetCount = Object.keys(group.spendingLimits.perTarget).length;
      console.log(`    - Per-target limits: ${targetCount} targets`);
    }
    if (group.allowedRecipients) {
      console.log(
        `    - Allowed recipients: ${group.allowedRecipients.length}`
      );
    }
    if (group.blockedRecipients) {
      console.log(
        `    - Blocked recipients: ${group.blockedRecipients.length}`
      );
    }
    if (group.rateLimits) {
      const hours = group.rateLimits.windowMs / (60 * 60 * 1000);
      console.log(
        `    - Rate limit: ${group.rateLimits.maxPayments} per ${hours} hour(s)`
      );
    }
  });
} else {
  console.log('⚠️  No payment policies configured');
  console.log('   Create payment-policies.json to enable policy enforcement');
}
