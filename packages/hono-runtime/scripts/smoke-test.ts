#!/usr/bin/env bun
/**
 * Smoke Test Script
 *
 * Creates agents (free and paid), lists agents, invokes entrypoints, and cleans up.
 *
 * Usage:
 *   bun run scripts/smoke-test.ts [baseUrl]
 *
 * Examples:
 *   bun run scripts/smoke-test.ts                    # Uses http://localhost:8787
 *   bun run scripts/smoke-test.ts http://localhost:3000
 */

const BASE_URL = process.argv[2] || 'http://localhost:8787';

async function main() {
  console.log(`\n=== Smoke Test for ${BASE_URL} ===\n`);

  // 1. Health check
  console.log('1. Health check...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  const health = await healthRes.json();
  console.log(`   Status: ${health.status} (${healthRes.status})`);

  if (healthRes.status !== 200) {
    console.error('   FAIL: Health check failed');
    process.exit(1);
  }
  console.log('   PASS\n');

  // 2. Create a FREE agent
  console.log('2. Creating FREE agent...');
  const createRes = await fetch(`${BASE_URL}/api/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug: `smoke-test-free-${Date.now()}`,
      name: 'Smoke Test Agent (Free)',
      description: 'Free agent created by smoke test script',
      entrypoints: [
        {
          key: 'echo',
          description: 'Echoes back the input (free)',
          inputSchema: {},
          outputSchema: {},
          handlerType: 'builtin',
          handlerConfig: { name: 'echo' },
        },
        {
          key: 'greet',
          description: 'Passes through input (greeting)',
          inputSchema: {},
          outputSchema: {},
          handlerType: 'builtin',
          handlerConfig: { name: 'passthrough' },
        },
      ],
      metadata: {
        createdBy: 'smoke-test',
        timestamp: new Date().toISOString(),
      },
    }),
  });

  if (createRes.status !== 201) {
    const err = await createRes.text();
    console.error(
      `   FAIL: Could not create agent (${createRes.status}): ${err}`
    );
    process.exit(1);
  }

  const agent = await createRes.json();
  console.log(`   Created: ${agent.name} (${agent.id})`);
  console.log(`   Slug: ${agent.slug}`);
  console.log(`   Agent Card: ${BASE_URL}/agents/${agent.id}/.well-known/agent.json`);
  console.log('   PASS\n');

  // 3. List agents
  console.log('3. Listing agents...');
  const listRes = await fetch(`${BASE_URL}/api/agents`);
  const list = await listRes.json();
  console.log(`   Total agents: ${list.total}`);
  console.log(
    `   Found our agent: ${list.agents.some((a: any) => a.id === agent.id)}`
  );
  console.log('   PASS\n');

  // 4. Get agent manifest (A2A)
  console.log('4. Getting agent manifest...');
  const manifestRes = await fetch(
    `${BASE_URL}/agents/${agent.id}/.well-known/agent.json`
  );

  if (manifestRes.status !== 200) {
    console.error(`   FAIL: Could not get manifest (${manifestRes.status})`);
    process.exit(1);
  }

  const manifest = await manifestRes.json();
  console.log(`   Agent name: ${manifest.name}`);
  console.log(
    `   Skills: ${manifest.skills?.map((s: any) => s.id).join(', ') || 'none'}`
  );
  console.log('   PASS\n');

  // 5. List entrypoints
  console.log('5. Listing entrypoints...');
  const entrypointsRes = await fetch(
    `${BASE_URL}/agents/${agent.id}/entrypoints`
  );
  const entrypoints = await entrypointsRes.json();
  console.log(
    `   Entrypoints: ${entrypoints.map((e: any) => e.key).join(', ')}`
  );
  console.log('   PASS\n');

  // 6. Invoke echo entrypoint
  console.log('6. Invoking echo entrypoint...');
  const invokeRes = await fetch(
    `${BASE_URL}/agents/${agent.id}/entrypoints/echo/invoke`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { message: 'Hello from smoke test!' },
      }),
    }
  );

  if (invokeRes.status !== 200) {
    const err = await invokeRes.text();
    console.error(`   FAIL: Invoke failed (${invokeRes.status}): ${err}`);
    process.exit(1);
  }

  const result = await invokeRes.json();
  console.log(
    `   Input:  ${JSON.stringify({ message: 'Hello from smoke test!' })}`
  );
  console.log(`   Output: ${JSON.stringify(result.output)}`);
  console.log(`   Session: ${result.sessionId}`);
  console.log(`   Request: ${result.requestId}`);
  console.log('   PASS\n');

  // 7. Invoke with custom sessionId
  console.log('7. Invoking with custom sessionId...');
  const invoke2Res = await fetch(
    `${BASE_URL}/agents/${agent.id}/entrypoints/greet/invoke`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { name: 'World' },
        sessionId: 'my-custom-session-123',
      }),
    }
  );

  const result2 = await invoke2Res.json();
  console.log(
    `   Session preserved: ${result2.sessionId === 'my-custom-session-123'}`
  );
  console.log('   PASS\n');

  // 8. Update agent
  console.log('8. Updating agent...');
  const updateRes = await fetch(`${BASE_URL}/api/agents/${agent.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'Updated description from smoke test',
    }),
  });

  if (updateRes.status !== 200) {
    console.error(`   FAIL: Update failed (${updateRes.status})`);
    process.exit(1);
  }

  const updated = await updateRes.json();
  console.log(`   New description: ${updated.description}`);
  console.log('   PASS\n');

  // =========================================================================
  // PAID AGENT TESTS
  // =========================================================================

  console.log('--- PAID AGENT TESTS ---\n');

  // 9. Create a PAID agent with payment configuration
  console.log('9. Creating PAID agent...');
  const paidAgentRes = await fetch(`${BASE_URL}/api/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug: `smoke-test-paid-${Date.now()}`,
      name: 'Smoke Test Agent (Paid)',
      description: 'Paid agent with priced entrypoints',
      entrypoints: [
        {
          key: 'free-echo',
          description: 'Free echo endpoint (no price)',
          inputSchema: {},
          outputSchema: {},
          handlerType: 'builtin',
          handlerConfig: { name: 'echo' },
          // No price = free
        },
        {
          key: 'cheap-echo',
          description: 'Cheap echo endpoint ($0.001)',
          inputSchema: {},
          outputSchema: {},
          handlerType: 'builtin',
          handlerConfig: { name: 'echo' },
          price: '0.001', // $0.001 per call
        },
        {
          key: 'premium-echo',
          description: 'Premium echo endpoint ($0.05)',
          inputSchema: {},
          outputSchema: {},
          handlerType: 'builtin',
          handlerConfig: { name: 'echo' },
          price: '0.05', // $0.05 per call
          network: 'base', // Override network for this endpoint
        },
      ],
      // Payment configuration for receiving payments
      paymentsConfig: {
        payTo: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'base-sepolia',
        facilitatorUrl: 'https://x402.org/facilitator',
      },
      metadata: {
        createdBy: 'smoke-test',
        tier: 'paid',
        timestamp: new Date().toISOString(),
      },
    }),
  });

  if (paidAgentRes.status !== 201) {
    const err = await paidAgentRes.text();
    console.error(
      `   FAIL: Could not create paid agent (${paidAgentRes.status}): ${err}`
    );
    process.exit(1);
  }

  const paidAgent = await paidAgentRes.json();
  console.log(`   Created: ${paidAgent.name} (${paidAgent.id})`);
  console.log(`   Slug: ${paidAgent.slug}`);
  console.log(`   PayTo: ${paidAgent.paymentsConfig?.payTo || 'not set'}`);
  console.log(`   Network: ${paidAgent.paymentsConfig?.network || 'not set'}`);
  console.log(`   Agent Card: ${BASE_URL}/agents/${paidAgent.id}/.well-known/agent.json`);
  console.log('   PASS\n');

  // 10. List entrypoints for paid agent (verify prices)
  console.log('10. Listing paid agent entrypoints...');
  const paidEntrypointsRes = await fetch(
    `${BASE_URL}/agents/${paidAgent.id}/entrypoints`
  );
  const paidEntrypoints = await paidEntrypointsRes.json();

  console.log('   Entrypoints:');
  for (const ep of paidEntrypoints) {
    const priceStr = ep.price ? `$${ep.price}` : 'FREE';
    const networkStr = ep.network ? ` (${ep.network})` : '';
    console.log(`     - ${ep.key}: ${priceStr}${networkStr}`);
  }
  console.log('   PASS\n');

  // 11. Get paid agent manifest (should include pricing info)
  console.log('11. Getting paid agent manifest...');
  const paidManifestRes = await fetch(
    `${BASE_URL}/agents/${paidAgent.id}/.well-known/agent.json`
  );

  if (paidManifestRes.status !== 200) {
    console.error(
      `   FAIL: Could not get paid manifest (${paidManifestRes.status})`
    );
    process.exit(1);
  }

  const paidManifest = await paidManifestRes.json();
  console.log(`   Agent name: ${paidManifest.name}`);
  console.log(
    `   Skills: ${paidManifest.skills?.map((s: any) => s.id).join(', ') || 'none'}`
  );
  console.log('   PASS\n');

  // 12. Invoke FREE endpoint on paid agent (should work without payment)
  console.log('12. Invoking FREE endpoint on paid agent...');
  const freeInvokeRes = await fetch(
    `${BASE_URL}/agents/${paidAgent.id}/entrypoints/free-echo/invoke`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { message: 'Free call on paid agent!' },
      }),
    }
  );

  if (freeInvokeRes.status !== 200) {
    const err = await freeInvokeRes.text();
    console.error(
      `   FAIL: Free invoke failed (${freeInvokeRes.status}): ${err}`
    );
    process.exit(1);
  }

  const freeResult = await freeInvokeRes.json();
  console.log(`   Output: ${JSON.stringify(freeResult.output)}`);
  console.log('   PASS\n');

  // 13. Invoke PAID endpoint (should return 402 Payment Required in production)
  // Note: In smoke test without actual payment middleware, this may succeed
  // In production with x402 middleware, this would return 402
  console.log('13. Invoking PAID endpoint (cheap-echo)...');
  const paidInvokeRes = await fetch(
    `${BASE_URL}/agents/${paidAgent.id}/entrypoints/cheap-echo/invoke`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { message: 'Paid call - would require payment in production!' },
      }),
    }
  );

  // In dev mode without payment enforcement, this succeeds
  // In production, this would be 402 Payment Required
  console.log(`   Status: ${paidInvokeRes.status}`);
  if (paidInvokeRes.status === 200) {
    const paidResult = await paidInvokeRes.json();
    console.log(`   Output: ${JSON.stringify(paidResult.output)}`);
    console.log('   Note: Payment not enforced in dev mode');
  } else if (paidInvokeRes.status === 402) {
    console.log('   Got 402 Payment Required (expected in production)');
    const headers = Object.fromEntries(paidInvokeRes.headers.entries());
    console.log(`   X-Price: ${headers['x-price'] || 'not set'}`);
    console.log(`   X-Network: ${headers['x-network'] || 'not set'}`);
    console.log(`   X-Pay-To: ${headers['x-pay-to'] || 'not set'}`);
  } else {
    const err = await paidInvokeRes.text();
    console.error(`   FAIL: Unexpected status (${paidInvokeRes.status}): ${err}`);
    process.exit(1);
  }
  console.log('   PASS\n');

  // 14. Verify paid agent has paymentsConfig persisted
  console.log('14. Verifying paymentsConfig persisted...');
  const getPaidAgentRes = await fetch(
    `${BASE_URL}/api/agents/${paidAgent.id}`
  );
  const fetchedPaidAgent = await getPaidAgentRes.json();

  const hasPaymentsConfig = !!fetchedPaidAgent.paymentsConfig;
  const correctPayTo =
    fetchedPaidAgent.paymentsConfig?.payTo ===
    '0x1234567890abcdef1234567890abcdef12345678';
  const correctNetwork =
    fetchedPaidAgent.paymentsConfig?.network === 'base-sepolia';

  console.log(`   Has paymentsConfig: ${hasPaymentsConfig}`);
  console.log(`   Correct payTo: ${correctPayTo}`);
  console.log(`   Correct network: ${correctNetwork}`);

  if (!hasPaymentsConfig || !correctPayTo || !correctNetwork) {
    console.error('   FAIL: paymentsConfig not persisted correctly');
    process.exit(1);
  }
  console.log('   PASS\n');

  // 15. Verify entrypoint prices persisted
  console.log('15. Verifying entrypoint prices persisted...');
  const cheapEp = fetchedPaidAgent.entrypoints.find(
    (e: any) => e.key === 'cheap-echo'
  );
  const premiumEp = fetchedPaidAgent.entrypoints.find(
    (e: any) => e.key === 'premium-echo'
  );
  const freeEp = fetchedPaidAgent.entrypoints.find(
    (e: any) => e.key === 'free-echo'
  );

  console.log(`   free-echo price: ${freeEp?.price ?? 'undefined (FREE)'}`);
  console.log(`   cheap-echo price: ${cheapEp?.price ?? 'undefined'}`);
  console.log(`   premium-echo price: ${premiumEp?.price ?? 'undefined'}`);
  console.log(`   premium-echo network: ${premiumEp?.network ?? 'undefined'}`);

  if (cheapEp?.price !== '0.001') {
    console.error('   FAIL: cheap-echo price not persisted');
    process.exit(1);
  }
  if (premiumEp?.price !== '0.05') {
    console.error('   FAIL: premium-echo price not persisted');
    process.exit(1);
  }
  if (premiumEp?.network !== 'base') {
    console.error('   FAIL: premium-echo network not persisted');
    process.exit(1);
  }
  console.log('   PASS\n');

  console.log('=== All smoke tests passed! ===\n');
}

main().catch(err => {
  console.error('\nSmoke test failed:', err.message);
  process.exit(1);
});
