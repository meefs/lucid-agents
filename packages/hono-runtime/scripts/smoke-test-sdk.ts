#!/usr/bin/env bun
/**
 * Smoke Test using generated SDK client.
 *
 * Usage:
 *   bun run scripts/smoke-test-sdk.ts [baseUrl]
 *
 * Example:
 *   bun run scripts/smoke-test-sdk.ts http://localhost:8787
 */

import { createClient } from '../sdk/client';
import {
  getHealth,
  postApiAgents,
  getApiAgents,
  getAgentsByAgentIdWellKnownAgentJson,
  getAgentsByAgentIdEntrypoints,
  postAgentsByAgentIdEntrypointsByKeyInvoke,
  putApiAgentsByAgentId,
} from '../sdk';

const BASE_URL = process.argv[2] || 'http://localhost:8787';

function unwrap<T>(value: any): T {
  return (value && typeof value === 'object' && 'data' in value
    ? (value as any).data
    : value) as T;
}

async function main() {
  console.log(`\n=== SDK Smoke Test for ${BASE_URL} ===\n`);

  const client = createClient({
    baseUrl: BASE_URL,
    responseStyle: 'data',
  });

  // 1. Health check
  console.log('1. Health check...');
  const healthRes = await getHealth({
    client,
    responseStyle: 'fields',
    throwOnError: true,
  });
  const health = unwrap<{ status: string }>(healthRes);
  if (!health || health.status !== 'ok') {
    throw new Error(`Health check failed: ${JSON.stringify(healthRes)}`);
  }
  console.log('   PASS\n');

  // 2. Create FREE agent (includes builtin, js, url)
  console.log('2. Creating FREE agent...');
  const freeAgent = unwrap<{
    id: string;
    slug: string;
    entrypoints: Array<{ key: string }>;
  }>(
    await postApiAgents({
      client,
      body: {
        slug: `sdk-free-${Date.now()}`,
        name: 'SDK Smoke Agent (Free)',
        description: 'Free agent created by SDK smoke test',
        entrypoints: [
        {
          key: 'echo',
          description: 'Echo via builtin',
          handlerType: 'builtin',
          handlerConfig: { name: 'echo' },
        },
        {
          key: 'greet',
          description: 'Passthrough greeting',
          handlerType: 'builtin',
          handlerConfig: { name: 'passthrough' },
        },
        {
          key: 'now',
          description: 'Timestamp via JS handler',
          handlerType: 'js',
          handlerConfig: {
            code: 'return { now: Date.now(), input };',
            timeoutMs: 500,
          },
        },
        {
          key: 'example-api',
          description: 'Fetch example.com via URL handler',
          handlerType: 'url',
          handlerConfig: {
            url: 'https://example.com',
            allowedHosts: ['example.com'],
            timeoutMs: 1000,
          },
        },
      ],
      },
    })
  );
  console.log(`   Created free agent: ${freeAgent.id}`);
  console.log('   PASS\n');

  // 3. List agents
  console.log('3. Listing agents...');
  const agents = unwrap<{ agents?: Array<{ id: string }> }>(
    await getApiAgents({ client })
  );
  const foundFree = agents.agents?.some(a => a.id === freeAgent.id);
  console.log(`   Found free agent: ${Boolean(foundFree)}`);
  console.log('   PASS\n');

  // 4. Manifest
  console.log('4. Fetching manifest...');
  const manifest = unwrap<{ skills?: Array<{ id: string }> }>(
    await getAgentsByAgentIdWellKnownAgentJson({
      client,
      path: { agentId: freeAgent.id },
    })
  );
  console.log(
    `   Skills: ${manifest.skills?.map(s => s.id).join(', ') || 'none'}`
  );
  console.log('   PASS\n');

  // 5. Entrypoints list
  console.log('5. Listing entrypoints...');
  const entrypoints = unwrap<Array<{ key: string }>>(
    await getAgentsByAgentIdEntrypoints({
      client,
      path: { agentId: freeAgent.id },
    })
  );
  console.log(`   Entrypoints: ${entrypoints.map(e => e.key).join(', ')}`);
  console.log('   PASS\n');

  // 6. Invoke echo
  console.log('6. Invoking echo...');
  const echoResult = unwrap<{ output?: unknown }>(
    await postAgentsByAgentIdEntrypointsByKeyInvoke({
      client,
      path: { agentId: freeAgent.id, key: 'echo' },
      body: { input: { message: 'hi from sdk smoke' } },
    })
  );
  console.log(`   Output: ${JSON.stringify(echoResult.output)}`);
  console.log('   PASS\n');

  // 7. Invoke JS entrypoint
  console.log('7. Invoking JS entrypoint...');
  const jsResult = unwrap<{ output?: unknown }>(
    await postAgentsByAgentIdEntrypointsByKeyInvoke({
      client,
      path: { agentId: freeAgent.id, key: 'now' },
      body: { input: { source: 'sdk-smoke' } },
    })
  );
  console.log(`   Output: ${JSON.stringify(jsResult.output)}`);
  console.log('   PASS\n');

  // 8. Invoke URL entrypoint
  console.log('8. Invoking URL entrypoint...');
  const urlResult = unwrap<{ output?: { status?: number } }>(
    await postAgentsByAgentIdEntrypointsByKeyInvoke({
      client,
      path: { agentId: freeAgent.id, key: 'example-api' },
      body: { input: {} },
    })
  );
  console.log(`   Status: ${urlResult.output?.status}`);
  console.log('   PASS\n');

  // 9. Update agent
  console.log('9. Updating agent description...');
  const updated = unwrap<{ description?: string }>(
    await putApiAgentsByAgentId({
      client,
      path: { agentId: freeAgent.id },
      body: { description: 'Updated via SDK smoke test' },
    })
  );
  console.log(`   New description: ${updated.description}`);
  console.log('   PASS\n');

  console.log('SDK smoke test complete.\n');
}

main().catch(err => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
