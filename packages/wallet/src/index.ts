export type {
  NormalizedChallenge,
  ChallengeMessageEncoding,
} from './connectors/base-connector';
export {
  normalizeChallenge,
  extractSignature,
  extractWalletMetadata,
  detectMessageEncoding,
} from './connectors/base-connector';

export {
  LocalEoaWalletConnector,
  type LocalEoaWalletConnectorOptions,
} from './connectors/local-eoa-connector';
export {
  ServerOrchestratorWalletConnector,
  ServerOrchestratorMissingAccessTokenError,
  type ServerOrchestratorWalletConnectorOptions,
} from './connectors/server-orchestrator-connector';
export {
  ThirdwebWalletConnector,
  type ThirdwebWalletConnectorOptions,
} from './connectors/thirdweb-connector';
export { createPrivateKeySigner } from './private-key-signer';
export {
  createSignerConnector,
  type CompatibleWallet,
} from './connectors/signer-connector';
export {
  createAgentWallet,
  createDeveloperWallet,
  createWalletsRuntime,
} from './runtime';
export type { WalletsRuntime } from '@lucid-agents/types/wallets';
export { walletsFromEnv } from './env';
export { wallets } from './extension';

// Export utilities
export * from './utils';
