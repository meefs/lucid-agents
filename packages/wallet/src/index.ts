export type {
  WalletConnector,
  WalletMetadata,
  ChallengeSigner,
} from '@lucid-agents/types/wallets';
export type {
  NormalizedChallenge,
  ChallengeMessageEncoding,
  ChallengeNormalizationOptions,
} from './base-connector.js';
export {
  normalizeChallenge,
  stableJsonStringify,
  extractSignature,
  extractWalletMetadata,
  detectMessageEncoding,
} from './base-connector.js';

export {
  LocalEoaWalletConnector,
  type LocalEoaWalletConnectorOptions,
} from './local-eoa-connector.js';
export {
  ServerOrchestratorWalletConnector,
  ServerOrchestratorMissingAccessTokenError,
  type ServerOrchestratorWalletConnectorOptions,
} from './server-orchestrator-connector.js';
export { createPrivateKeySigner } from './private-key-signer.js';
export { createAgentWallet } from './create-agent-wallet.js';
export type {
  AgentWalletHandle,
  AgentWalletKind,
} from '@lucid-agents/types/wallets';
export type {
  AgentChallenge,
  AgentChallengeResponse,
  AgentWalletConfig,
  AgentWalletFactoryOptions,
  DeveloperWalletConfig,
  FetchExecutor,
  LocalEoaSigner,
  LocalWalletOptions,
  LocalWalletWithPrivateKeyOptions,
  LocalWalletWithSignerOptions,
  LucidWalletOptions,
  TypedDataPayload,
  WalletsConfig,
} from '@lucid-agents/types/wallets';
export { walletsFromEnv } from './env.js';
