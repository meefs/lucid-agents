---
'@lucid-agents/wallet': minor
'@lucid-agents/examples': patch
---

## Summary

- Thirdweb Engine wallets now expose the same signer/wallet client surface as local or Lucid wallets. The connector returns a viem wallet client via `getWalletClient()` and reuses it for `signChallenge`, so x402, identity, and custom contract calls all share the Engine-managed key.
- The thirdweb example was rewritten to rely on the configured connector (no manual Engine re-initialisation) and demonstrates sending 0.01 USDC directly through the SDK-managed wallet client.
- Documentation clarifies that configuring `wallets({ agent: { type: 'thirdweb', ... } })` is all that’s required.

## Breaking Changes

None. Existing thirdweb configurations continue to work, but the connector now provides additional capabilities (exposed signer + wallet client) that were previously unavailable.

## Migration Notes

- No code changes required if you already configure `type: 'thirdweb'`.
- If you previously re-created Engine clients manually, replace that code with `const walletClient = await agent.wallets.agent.connector.getWalletClient();` so you reuse the SDK-managed signer for transfers or other contract interactions.

### Usage Example

```ts
const agent = await createAgent(meta)
  .use(http())
  .use(
    wallets({
      config: {
        agent: {
          type: 'thirdweb',
          secretKey: process.env.THIRDWEB_SECRET_KEY!,
          clientId: process.env.THIRDWEB_CLIENT_ID,
          walletLabel: 'agent-wallet',
          chainId: 84532,
        },
      },
    })
  )
  .build();

const connector = agent.wallets?.agent?.connector as ThirdwebWalletConnector;
const walletClient = await connector.getWalletClient();

await walletClient.writeContract({
  account: walletClient.account,
  chain: walletClient.chain,
  address: USDC_ADDRESS,
  abi: erc20Abi,
  functionName: 'transfer',
  args: ['0xEA4b0D5ebF46C22e4c7E6b6164706447e67B9B1D', 10_000n], // 0.01 USDC
});
```