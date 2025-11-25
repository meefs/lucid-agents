---
'@lucid-agents/wallet': minor
'@lucid-agents/examples': patch
---

## Summary

- Added a brand-new thirdweb Engine wallet connector to the wallets extension. It spins up the Engine-managed account, exposes `getWalletClient()` / `getSigner()`, and plugs into the standard `WalletConnector` API so x402, identity, and contract calls share the same Engine key material.
- Introduced a new signer connector that unifies all connectors on the shared `LocalEoaSigner` surface, giving thirdweb the same runtime affordances as local/Lucid wallets without extra wiring.
- Added `packages/examples/src/wallet/thirdweb-engine-wallets.ts`, an end-to-end script that configures `wallets({ agent: { type: 'thirdweb', ... } })`, signs the facilitator challenge, and transfers 0.01 USDC via the connector-managed viem client.
- Updated `docs/WALLETS.md` and the root `README.md` with thirdweb configuration guidance and instructions for reusing the exposed wallet client—no manual Engine client creation required.

## Breaking Changes

None. This PR adds the thirdweb connector; existing wallets continue to behave the same.

## Migration Notes

- New capability – Configure `wallets({ agent: { type: 'thirdweb', ... } })` to opt into the thirdweb connector and call `const walletClient = await agent.wallets.agent.connector.getWalletClient();` when you need to send transactions.
- Local/Lucid wallets are unchanged.

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