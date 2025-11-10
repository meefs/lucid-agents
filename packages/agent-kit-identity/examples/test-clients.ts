/**
 * Test script to verify all three registry clients are created and accessible
 */

import { createAgentIdentity } from '../src/init';

async function main() {
  console.log('Testing ERC-8004 Registry Clients Integration\n');

  const identity = await createAgentIdentity({
    autoRegister: true,
    env: process.env as Record<string, string | undefined>,
  });

  console.log('Status:', identity.status);
  console.log('Domain:', identity.domain);
  console.log('Agent ID:', identity.record?.agentId?.toString());
  console.log('Transaction:', identity.transactionHash);
  console.log('Signature:', identity.signature?.slice(0, 20) + '...\n');

  if (identity.clients) {
    console.log('Registry Clients Created Successfully!\n');

    // Test Identity Registry Client
    console.log('Identity Registry:');
    console.log('   - Address:', identity.clients.identity.address);
    console.log('   - Chain ID:', identity.clients.identity.chainId);

    // Test Reputation Registry Client
    console.log('\nReputation Registry:');
    console.log('   - Address:', identity.clients.reputation.address);
    console.log('   - Chain ID:', identity.clients.reputation.chainId);
    console.log(
      '   - Methods:',
      Object.keys(identity.clients.reputation).filter(
        k => typeof (identity.clients!.reputation as any)[k] === 'function'
      )
    );

    // Test Validation Registry Client
    console.log('\nValidation Registry:');
    console.log('   - Address:', identity.clients.validation.address);
    console.log('   - Chain ID:', identity.clients.validation.chainId);
    console.log(
      '   - Methods:',
      Object.keys(identity.clients.validation).filter(
        k => typeof (identity.clients!.validation as any)[k] === 'function'
      )
    );

    console.log('\n🚀 All registry clients are ready to use!');

    // Example: Query reputation summary
    if (identity.record?.agentId) {
      try {
        const summary = await identity.clients.reputation.getSummary(
          identity.record.agentId
        );
        console.log('\nReputation Summary:');
        console.log('   - Total Feedback:', summary.count.toString());
        console.log('   - Average Score:', summary.averageScore);
      } catch (error) {
        console.log(
          '\nReputation Summary: No feedback yet (this is normal for new agents)'
        );
      }
    }
  } else {
    console.log(
      'Registry clients were not created (missing RPC_URL or configuration)'
    );
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
